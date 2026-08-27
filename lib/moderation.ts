import type { SupabaseClient } from "@supabase/supabase-js";

export async function isUserBlocked(
  supabase: SupabaseClient,
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  if (error) {
    console.error("isUserBlocked failed:", error.message);
    return false;
  }

  return Boolean(data);
}

/** Every id the member has blocked — used to filter their Feed. */
export async function getBlockedUserIds(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", userId);

  if (error) {
    console.error("getBlockedUserIds failed:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((r) => r.blocked_id as string));
}

export async function blockUser(supabase: SupabaseClient, blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from("user_blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) {
    throw new Error(error.message);
  }
}

export async function unblockUser(supabase: SupabaseClient, blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function reportUser(
  supabase: SupabaseClient,
  reporterId: string,
  reportedId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase.from("user_reports").insert({
    reporter_id: reporterId,
    reported_id: reportedId,
    reason: reason.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export type UserReport = {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedId: string;
  reportedName: string;
  reason: string;
  createdAt: string;
};

type UserReportRow = {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  created_at: string;
  reporter: { full_name: string } | null;
  reported: { full_name: string } | null;
};

const USER_REPORT_SELECT =
  "id, reporter_id, reported_id, reason, created_at, " +
  "reporter:profiles!user_reports_reporter_id_fkey(full_name), " +
  "reported:profiles!user_reports_reported_id_fkey(full_name)";

/** Unreviewed reports, oldest first — platform-admin only (see
 * user_reports_select_admin RLS policy). Nothing read this table before;
 * without an admin queue, submitted reports were invisible forever. */
export async function getOpenReports(supabase: SupabaseClient): Promise<UserReport[]> {
  const { data, error } = await supabase
    .from("user_reports")
    .select(USER_REPORT_SELECT)
    .is("reviewed_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getOpenReports failed:", error.message);
    return [];
  }

  return (data as unknown as UserReportRow[]).map((row) => ({
    id: row.id,
    reporterId: row.reporter_id,
    reporterName: row.reporter?.full_name ?? "Учасник ANEXA",
    reportedId: row.reported_id,
    reportedName: row.reported?.full_name ?? "Учасник ANEXA",
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

export async function markReportReviewed(supabase: SupabaseClient, reportId: string): Promise<void> {
  const { error } = await supabase
    .from("user_reports")
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: (await supabase.auth.getUser()).data.user?.id })
    .eq("id", reportId);

  if (error) {
    throw new Error(error.message);
  }
}
