import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./profile";

/**
 * "People You May Know" recommendation engine.
 *
 * Deliberately a plain, structured-data scorer — not a model. Every signal
 * below reads straight off the profile/graph data members already filled in
 * (interests, profession, skills, communities, location, languages, mutual
 * connections). Weights live in one place (MATCH_WEIGHTS) so they're easy to
 * retune without touching the scoring logic itself.
 *
 * Extension point for later: `computeCompatibilityScore` and `getRecommendedPeople`
 * are the only two functions call sites depend on. A future behavioral layer
 * (who a member views/messages, which communities they're active in, which
 * topics they read) can extend `RecommendationInput`/`RecommendationContext`
 * with extra signals and fold them into the weighted sum here, or replace the
 * body entirely with a model call — call sites and the response shape stay
 * the same either way. The score and a plain-language reason are the only
 * things ever exposed to the client; the weights and per-signal math never
 * leave the server.
 */

export type MatchWeights = {
  interests: number;
  profession: number;
  skills: number;
  communities: number;
  location: number;
  languages: number;
  mutualConnections: number;
};

/** Starting weights — an initial model, not a final one. Adjust freely; the
 * scorer normalizes by the total, so they don't need to sum to 100. */
export const MATCH_WEIGHTS: MatchWeights = {
  interests: 30,
  profession: 20,
  skills: 15,
  communities: 15,
  location: 10,
  languages: 5,
  mutualConnections: 5,
};

export type RecommendationInput = Pick<
  Profile,
  "id" | "full_name" | "role_title" | "company" | "avatar_url" | "bio" | "industries" | "skills" | "interests" | "location" | "languages" | "username"
>;

export type RecommendationContext = {
  sharedCommunities: number;
  mutualConnections: number;
};

export type RecommendedPerson = {
  profile: RecommendationInput;
  score: number; // 0-100, shown to the user as "N% match"
  reasons: string[]; // plain-language, e.g. "4 спільні інтереси" — never the formula
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().trim();
}

function normalizeTags(values: string[] | undefined): string[] {
  return (values ?? []).map((v) => v.toLowerCase().trim()).filter(Boolean);
}

/** `languages` is stored as a loosely-typed jsonb array — items may be plain
 * strings or `{ name }`/`{ language }` objects depending on how the profile
 * editor saved them. This best-effort-normalizes either shape to lowercase
 * strings so overlap comparison doesn't care which form a given row used. */
function normalizeLanguages(values: unknown[] | undefined): string[] {
  return (values ?? [])
    .map((v) => {
      if (typeof v === "string") return v.toLowerCase().trim();
      if (v && typeof v === "object") {
        const obj = v as Record<string, unknown>;
        const name = obj.name ?? obj.language ?? obj.label;
        return typeof name === "string" ? name.toLowerCase().trim() : "";
      }
      return "";
    })
    .filter(Boolean);
}

/** Overlap ratio (0-1) between two tag lists — share of the larger set that's
 * also in the smaller one. Also returns the actual overlapping tags so the
 * caller can build a human-readable reason from real values. */
function overlapRatio(a: string[], b: string[]): { ratio: number; overlap: string[] } {
  if (a.length === 0 || b.length === 0) return { ratio: 0, overlap: [] };
  const setA = new Set(a);
  const setB = new Set(b);
  const overlap = [...setB].filter((tag) => setA.has(tag));
  const denom = Math.max(setA.size, setB.size);
  return { ratio: overlap.length / denom, overlap };
}

/** Profession/field similarity: role title closeness blended with industry
 * overlap — the example in the spec ("Підприємець, Marketing, AI" matching
 * another "Підприємець, Marketing, AI") is exactly this combination. */
function professionScore(
  me: Pick<RecommendationInput, "role_title" | "industries">,
  other: Pick<RecommendationInput, "role_title" | "industries">
): { score: number; overlapIndustries: string[]; roleMatch: string | null } {
  const { ratio: industryRatio, overlap: overlapIndustries } = overlapRatio(
    normalizeTags(me.industries),
    normalizeTags(other.industries)
  );

  const myRole = normalizeText(me.role_title);
  const otherRole = normalizeText(other.role_title);
  let roleScore = 0;
  let roleMatch: string | null = null;
  if (myRole && otherRole) {
    if (myRole === otherRole) {
      roleScore = 1;
      roleMatch = other.role_title ?? null;
    } else {
      const myWords = myRole.split(/\s+/).filter((w) => w.length > 3);
      if (myWords.some((w) => otherRole.includes(w))) {
        roleScore = 0.5;
        roleMatch = other.role_title ?? null;
      }
    }
  }

  return { score: industryRatio * 0.6 + roleScore * 0.4, overlapIndustries, roleMatch };
}

/** City-level location match — compares the first comma-separated segment
 * (city) so "Salzburg, Austria" matches "Salzburg". */
function locationScore(myLocation: string | null, otherLocation: string | null): { score: number; city: string | null } {
  const a = normalizeText(myLocation).split(",")[0].trim();
  const b = normalizeText(otherLocation).split(",")[0].trim();
  if (!a || !b) return { score: 0, city: null };
  if (a === b) return { score: 1, city: myLocation?.split(",")[0].trim() ?? null };
  if (a.includes(b) || b.includes(a)) return { score: 0.6, city: myLocation?.split(",")[0].trim() ?? null };
  return { score: 0, city: null };
}

function pluralizeUk(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

/**
 * Pure, structured-data compatibility score (0-100) between two members plus
 * up to two plain-language reasons for the UI ("4 спільні інтереси"). Never
 * returns the weights or per-signal breakdown — only the final number and
 * human copy are meant to reach the client.
 */
export function computeCompatibilityScore(
  me: RecommendationInput,
  other: RecommendationInput,
  context: RecommendationContext,
  weights: MatchWeights = MATCH_WEIGHTS
): { score: number; reasons: string[] } {
  const interests = overlapRatio(normalizeTags(me.interests), normalizeTags(other.interests));
  const skills = overlapRatio(normalizeTags(me.skills), normalizeTags(other.skills));
  const languages = overlapRatio(normalizeLanguages(me.languages), normalizeLanguages(other.languages));
  const profession = professionScore(me, other);
  const location = locationScore(me.location, other.location);

  const communitiesRatio = Math.min(context.sharedCommunities, 5) / 5;
  const mutualRatio = Math.min(context.mutualConnections, 5) / 5;

  const totalWeight =
    weights.interests +
    weights.profession +
    weights.skills +
    weights.communities +
    weights.location +
    weights.languages +
    weights.mutualConnections;

  const weightedSum =
    interests.ratio * weights.interests +
    profession.score * weights.profession +
    skills.ratio * weights.skills +
    communitiesRatio * weights.communities +
    location.score * weights.location +
    languages.ratio * weights.languages +
    mutualRatio * weights.mutualConnections;

  const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;

  // Rank each signal by its actual weighted contribution and surface the
  // top ones as plain-language reasons — the numbers are real, the formula
  // that produced the ranking never is.
  const candidates: { contribution: number; reason: string }[] = [];

  if (interests.overlap.length > 0) {
    candidates.push({
      contribution: interests.ratio * weights.interests,
      reason: `${interests.overlap.length} ${pluralizeUk(interests.overlap.length, "спільний інтерес", "спільні інтереси", "спільних інтересів")}`,
    });
  }
  if (profession.overlapIndustries.length > 0) {
    candidates.push({
      contribution: profession.score * weights.profession,
      reason: `Спільна сфера: ${profession.overlapIndustries[0]}`,
    });
  } else if (profession.roleMatch) {
    candidates.push({
      contribution: profession.score * weights.profession,
      reason: `Схожа професія: ${profession.roleMatch}`,
    });
  }
  if (skills.overlap.length > 0) {
    candidates.push({
      contribution: skills.ratio * weights.skills,
      reason: `${skills.overlap.length} ${pluralizeUk(skills.overlap.length, "спільна навичка", "спільні навички", "спільних навичок")}`,
    });
  }
  if (context.sharedCommunities > 0) {
    candidates.push({
      contribution: communitiesRatio * weights.communities,
      reason: `${context.sharedCommunities} ${pluralizeUk(context.sharedCommunities, "спільна спільнота", "спільні спільноти", "спільних спільнот")}`,
    });
  }
  if (location.score > 0 && location.city) {
    candidates.push({ contribution: location.score * weights.location, reason: `Обидва з: ${location.city}` });
  }
  if (languages.overlap.length > 0) {
    candidates.push({
      contribution: languages.ratio * weights.languages,
      reason: `${languages.overlap.length} ${pluralizeUk(languages.overlap.length, "спільна мова", "спільні мови", "спільних мов")}`,
    });
  }
  if (context.mutualConnections > 0) {
    candidates.push({
      contribution: mutualRatio * weights.mutualConnections,
      reason: `${context.mutualConnections} ${pluralizeUk(context.mutualConnections, "спільний знайомий", "спільні знайомі", "спільних знайомих")}`,
    });
  }

  candidates.sort((a, b) => b.contribution - a.contribution);
  const reasons = candidates.slice(0, 2).map((c) => c.reason);

  return { score, reasons };
}

type RecommendationCandidateRow = {
  id: string;
  full_name: string;
  role_title: string | null;
  company: string | null;
  avatar_url: string | null;
  bio: string | null;
  industries: string[] | null;
  skills: string[] | null;
  interests: string[] | null;
  business_goals: string[] | null;
  languages: unknown[] | null;
  location: string | null;
  username: string | null;
  shared_communities: number;
  candidate_communities: number;
  mutual_connections: number;
};

/**
 * Ranked "People You May Know" for the Friends → Рекомендовані люди tab.
 * Candidate exclusion (self, existing connections of any status, blocked
 * either direction, unapproved/deleted accounts) happens server-side in the
 * get_recommendation_candidates RPC, where it has to — that data straddles
 * other members' rows that client-side RLS would otherwise hide. Scoring
 * itself stays in application code so the weights stay easy to tune.
 */
export async function getRecommendedPeople(
  supabase: SupabaseClient,
  me: RecommendationInput,
  limit: number = 10
): Promise<RecommendedPerson[]> {
  const poolSize = Math.min(Math.max(limit * 8, 60), 200);

  const { data, error } = await supabase.rpc("get_recommendation_candidates", {
    p_user_id: me.id,
    p_limit: poolSize,
  });

  if (error) {
    console.error("getRecommendedPeople failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as RecommendationCandidateRow[];

  const scored = rows.map((row) => {
    const profile: RecommendationInput = {
      id: row.id,
      full_name: row.full_name,
      role_title: row.role_title,
      company: row.company,
      avatar_url: row.avatar_url,
      bio: row.bio,
      industries: row.industries ?? [],
      skills: row.skills ?? [],
      interests: row.interests ?? [],
      location: row.location,
      languages: row.languages ?? [],
      username: row.username,
    };

    const { score, reasons } = computeCompatibilityScore(me, profile, {
      sharedCommunities: row.shared_communities,
      mutualConnections: row.mutual_connections,
    });

    return { profile, score, reasons };
  });

  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
