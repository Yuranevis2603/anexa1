import type { SupabaseClient } from "@supabase/supabase-js";

export const REFERRAL_AX = 100;

export type Referral = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  roleTitle: string | null;
  company: string | null;
  joinedAt: string;
};

type ReferralRow = {
  referred_id: string;
  created_at: string;
  referred: { full_name: string; avatar_url: string | null; role_title: string | null; company: string | null } | null;
};

const REFERRAL_SELECT =
  "referred_id, created_at, referred:profiles!referral_joins_referred_id_fkey(full_name, avatar_url, role_title, company)";

/** Everyone who joined through `userId`'s referral link, newest first. */
export async function getMyReferrals(supabase: SupabaseClient, userId: string): Promise<Referral[]> {
  const { data, error } = await supabase
    .from("referral_joins")
    .select(REFERRAL_SELECT)
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getMyReferrals failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as ReferralRow[]).map((row) => ({
    userId: row.referred_id,
    fullName: row.referred?.full_name ?? "Учасник ANEXA",
    avatarUrl: row.referred?.avatar_url ?? null,
    roleTitle: row.referred?.role_title ?? null,
    company: row.referred?.company ?? null,
    joinedAt: row.created_at,
  }));
}

/** How many people the members `userId` referred have themselves referred —
 * the "2nd-level network" callout. Two lightweight id-only reads instead of
 * a recursive query, consistent with the rest of this app's aggregation style. */
export async function getSecondLevelReferralCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data: mine, error: mineError } = await supabase
    .from("referral_joins")
    .select("referred_id")
    .eq("referrer_id", userId);

  if (mineError) {
    console.error("getSecondLevelReferralCount failed:", mineError.message);
    return 0;
  }

  const referredIds = ((mine ?? []) as { referred_id: string }[]).map((r) => r.referred_id);
  if (referredIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("referral_joins")
    .select("id", { count: "exact", head: true })
    .in("referrer_id", referredIds);

  if (error) {
    console.error("getSecondLevelReferralCount (count) failed:", error.message);
    return 0;
  }

  return count ?? 0;
}

/** Joins-per-week for the last `weeks` weeks (most recent last), for the
 * "Запрошення у часі" chart. */
export function bucketReferralsByWeek(referrals: Referral[], weeks = 10): { label: string; count: number }[] {
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const counts = new Array(weeks).fill(0);

  for (const r of referrals) {
    const age = now - new Date(r.joinedAt).getTime();
    const bucket = weeks - 1 - Math.floor(age / WEEK);
    if (bucket >= 0 && bucket < weeks) counts[bucket] += 1;
  }

  return counts.map((count, i) => ({ label: `Т${i + 1}`, count }));
}
