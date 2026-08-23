import type { SupabaseClient } from "@supabase/supabase-js";

export type Level = {
  level: number;
  title: string;
  min_ax: number;
};

export type ProfileStats = {
  /** Lifetime AX earned — drives the level/title below and never decreases.
   * Real value for the profile owner; 0 (RLS-blocked) for anyone else. */
  ax_points: number;
  /** Spendable AX balance — what a purchase/subscription feature should
   * debit. Same visibility rule as ax_points. */
  ax_balance: number;
  reputation: number | null;
  review_count: number;
  level: number;
  levelTitle: string;
};

export type LevelProgress = {
  level: number;
  title: string;
  /** 0-100, progress toward the next level (100 if already at the max level). */
  progressPercent: number;
  nextLevelAx: number | null;
};

let cachedLevels: Level[] | null = null;

/** Levels rarely change — fetch once per session instead of on every profile view. */
export async function getLevels(supabase: SupabaseClient): Promise<Level[]> {
  if (cachedLevels) return cachedLevels;

  const { data, error } = await supabase.from("levels").select("level, title, min_ax").order("level");

  if (error) {
    console.error("getLevels failed:", error.message);
    return [];
  }

  cachedLevels = (data ?? []) as Level[];
  return cachedLevels;
}

/**
 * One round trip instead of two: get_profile_public_stats (a SECURITY
 * DEFINER RPC) returns reputation/review_count/level/level_title for
 * everyone, and ax_points too — but only populated when the caller IS
 * userId, enforced inside the function itself rather than via a second,
 * RLS-gated query against profile_gamification directly.
 */
export async function getProfileStats(supabase: SupabaseClient, userId: string): Promise<ProfileStats> {
  const { data, error } = await supabase.rpc("get_profile_public_stats", { p_user_id: userId });

  if (error) console.error("getProfileStats failed:", error.message);

  const row = (
    data as
      | {
          reputation: number | null;
          review_count: number;
          level: number;
          level_title: string;
          ax_points: number | null;
          ax_balance: number | null;
        }[]
      | null
  )?.[0];

  return {
    ax_points: row?.ax_points ?? 0,
    ax_balance: row?.ax_balance ?? 0,
    reputation: row?.reputation ?? null,
    review_count: row?.review_count ?? 0,
    level: row?.level ?? 1,
    levelTitle: row?.level_title ?? "Starter",
  };
}

/**
 * Turns raw AX points + the levels table into "Level 7 · Builder, 62% to
 * next" for the header ring. Pure function — swap the ring/thresholds later
 * without touching call sites.
 */
export function computeLevelProgress(axPoints: number, levels: Level[]): LevelProgress {
  if (levels.length === 0) {
    return { level: 1, title: "Starter", progressPercent: 0, nextLevelAx: null };
  }

  const sorted = [...levels].sort((a, b) => a.level - b.level);
  let current = sorted[0];
  let next: Level | undefined;

  for (let i = 0; i < sorted.length; i++) {
    if (axPoints >= sorted[i].min_ax) {
      current = sorted[i];
      next = sorted[i + 1];
    } else {
      break;
    }
  }

  if (!next) {
    return { level: current.level, title: current.title, progressPercent: 100, nextLevelAx: null };
  }

  const span = next.min_ax - current.min_ax;
  const progressPercent = span > 0 ? Math.round(((axPoints - current.min_ax) / span) * 100) : 100;

  return {
    level: current.level,
    title: current.title,
    progressPercent: Math.min(Math.max(progressPercent, 0), 100),
    nextLevelAx: next.min_ax,
  };
}

export async function getMyReviewOf(
  supabase: SupabaseClient,
  reviewerId: string,
  revieweeId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id")
    .eq("reviewer_id", reviewerId)
    .eq("reviewee_id", revieweeId)
    .maybeSingle();

  if (error) {
    console.error("getMyReviewOf failed:", error.message);
    return false;
  }

  return Boolean(data);
}

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatarUrl: string | null;
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer: { full_name: string; avatar_url: string | null } | null;
};

const REVIEW_SELECT =
  "id, rating, comment, created_at, reviewer_id, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)";

/** Reviews received by `revieweeId`, newest first — reviews are a public
 * trust signal (select-all RLS), so this is fine to show to any viewer. */
export async function getReviews(supabase: SupabaseClient, revieweeId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("reviewee_id", revieweeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getReviews failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as ReviewRow[]).map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    reviewerId: row.reviewer_id,
    reviewerName: row.reviewer?.full_name ?? "Учасник ANEXA",
    reviewerAvatarUrl: row.reviewer?.avatar_url ?? null,
  }));
}

export async function submitReview(
  supabase: SupabaseClient,
  reviewerId: string,
  revieweeId: string,
  rating: number,
  comment?: string
): Promise<void> {
  const { error } = await supabase.from("reviews").insert({
    reviewer_id: reviewerId,
    reviewee_id: revieweeId,
    rating,
    comment: comment?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ви вже залишали відгук цьому користувачу.");
    }
    throw new Error(error.message);
  }
}
