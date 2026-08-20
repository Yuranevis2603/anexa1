import type { SupabaseClient } from "@supabase/supabase-js";

export type Level = {
  level: number;
  title: string;
  min_ax: number;
};

export type ProfileStats = {
  /** Real balance for the profile owner; 0 (RLS-blocked, never rendered) for anyone else viewing this profile. */
  ax_points: number;
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
 * ax_points is intentionally split from the rest: profile_gamification's
 * RLS only lets the owner read their own row, so ax_points comes back 0 for
 * anyone viewing someone else's profile (the UI never renders it in that
 * case either — this is defense in depth, not the only guard). Reputation/
 * review_count/level come from get_profile_public_stats, a SECURITY DEFINER
 * RPC that deliberately exposes those columns to every member without
 * exposing the raw AX balance.
 */
export async function getProfileStats(supabase: SupabaseClient, userId: string): Promise<ProfileStats> {
  const [{ data: ownRow, error: ownError }, { data: publicRows, error: publicError }] = await Promise.all([
    supabase.from("profile_gamification").select("ax_points").eq("user_id", userId).maybeSingle(),
    supabase.rpc("get_profile_public_stats", { p_user_id: userId }),
  ]);

  if (ownError) console.error("getProfileStats (ax_points) failed:", ownError.message);
  if (publicError) console.error("getProfileStats (public) failed:", publicError.message);

  const publicStats = (publicRows as { reputation: number | null; review_count: number; level: number; level_title: string }[] | null)?.[0];

  return {
    ax_points: (ownRow?.ax_points as number | undefined) ?? 0,
    reputation: publicStats?.reputation ?? null,
    review_count: publicStats?.review_count ?? 0,
    level: publicStats?.level ?? 1,
    levelTitle: publicStats?.level_title ?? "Starter",
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
