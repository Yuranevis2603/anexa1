import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./profile";

export type MatchProfile = Pick<
  Profile,
  "id" | "full_name" | "role_title" | "company" | "avatar_url" | "bio" | "skills" | "interests" | "username"
>;

export type MatchCandidate = {
  profile: MatchProfile;
  score: number; // 0-100
  overlappingTags: string[];
};

/**
 * MVP overlap-based match score (0-100): share of the smaller tag set that
 * both members have in common across skills/interests/business goals. This
 * is intentionally simple and transparent — swap the body of this function
 * for a real recommendation model later without touching call sites.
 */
export function computeMatchScore(
  me: Pick<Profile, "skills" | "interests" | "business_goals">,
  other: Pick<Profile, "skills" | "interests" | "business_goals">
): { score: number; overlappingTags: string[] } {
  const normalize = (values: string[] | undefined) =>
    (values ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean);

  const mine = new Set([
    ...normalize(me.skills),
    ...normalize(me.interests),
    ...normalize(me.business_goals),
  ]);
  const theirsList = [
    ...normalize(other.skills),
    ...normalize(other.interests),
    ...normalize(other.business_goals),
  ];
  const theirs = new Set(theirsList);

  if (mine.size === 0 || theirs.size === 0) {
    return { score: 0, overlappingTags: [] };
  }

  const overlappingTags = theirsList.filter((tag, i) => mine.has(tag) && theirsList.indexOf(tag) === i);
  const denom = Math.max(mine.size, theirs.size);
  const score = Math.round((overlappingTags.length / denom) * 100);

  return { score, overlappingTags };
}

/**
 * Finds the single best potential match for `me` among other approved
 * members, based on skills/interests/business-goals overlap. Returns null
 * when there isn't enough profile signal to produce a meaningful match.
 */
export async function getTopMatch(
  supabase: SupabaseClient,
  me: Pick<Profile, "id" | "skills" | "interests" | "business_goals">
): Promise<MatchCandidate | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role_title, company, avatar_url, bio, skills, interests, business_goals, username")
    .neq("id", me.id)
    .limit(50);

  if (error || !data) {
    if (error) console.error("getTopMatch failed:", error.message);
    return null;
  }

  let best: MatchCandidate | null = null;
  for (const other of data as (MatchProfile & { business_goals: string[] })[]) {
    const { score, overlappingTags } = computeMatchScore(me, other);
    if (score > 0 && (!best || score > best.score)) {
      best = { profile: other, score, overlappingTags };
    }
  }

  return best;
}

/**
 * Multiple potential-match candidates for the Friends page "Рекомендації"
 * tab — same overlap scoring as getTopMatch, but returns up to `limit`
 * candidates and excludes anyone `me` already has a connection with
 * (accepted or pending, either direction).
 */
export async function getMatchRecommendations(
  supabase: SupabaseClient,
  me: Pick<Profile, "id" | "skills" | "interests" | "business_goals">,
  limit: number
): Promise<MatchCandidate[]> {
  const { data: connections } = await supabase
    .from("connections")
    .select("requester_id, addressee_id")
    .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`);

  const excluded = new Set<string>([me.id]);
  for (const c of (connections ?? []) as { requester_id: string; addressee_id: string }[]) {
    excluded.add(c.requester_id === me.id ? c.addressee_id : c.requester_id);
  }

  // Scan a bounded multiple of what's actually needed instead of an
  // unconditional flat 200 — keeps this cheap as the member base grows
  // while still giving the overlap scorer enough candidates to rank.
  const scanLimit = Math.min(Math.max(limit * 5, 50), 200);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role_title, company, avatar_url, bio, skills, interests, business_goals, username")
    .neq("id", me.id)
    .limit(scanLimit);

  if (error || !data) {
    if (error) console.error("getMatchRecommendations failed:", error.message);
    return [];
  }

  const candidates: MatchCandidate[] = [];
  for (const other of data as (MatchProfile & { business_goals: string[] })[]) {
    if (excluded.has(other.id)) continue;
    const { score, overlappingTags } = computeMatchScore(me, other);
    candidates.push({ profile: other, score, overlappingTags });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit);
}
