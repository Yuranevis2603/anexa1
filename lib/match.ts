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
