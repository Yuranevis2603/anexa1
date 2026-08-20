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
