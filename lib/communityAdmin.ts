import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommunityRoleTier } from "./communities";

async function logAudit(supabase: SupabaseClient, communityId: string, actorId: string, action: string): Promise<void> {
  const { error } = await supabase.from("community_audit_log").insert({ community_id: communityId, actor_id: actorId, action });
  if (error) {
    console.error("logAudit failed:", error.message);
  }
}

// ============================================================================
// Overview
// ============================================================================

export type OverviewStats = {
  memberCount: number;
  pendingRequests: number;
  joinedLast7Days: number;
  roleCounts: { owner: number; admin: number; moderator: number; member: number };
  joinsByDay: { label: string; count: number }[];
};

/** `createdBy` overrides the creator's own row to "owner" for the role
 * breakdown — their stored `role` is just whatever admin/moderator/member
 * value it defaults to (ownership isn't a stored role, see is_community_owner). */
export async function getOverviewStats(supabase: SupabaseClient, communityId: string, createdBy: string | null): Promise<OverviewStats> {
  const [{ data: members, error }, { count: pendingRequests }] = await Promise.all([
    supabase.from("community_members").select("user_id, role, joined_at").eq("community_id", communityId),
    supabase.from("community_join_requests").select("id", { count: "exact", head: true }).eq("community_id", communityId),
  ]);

  if (error) {
    console.error("getOverviewStats failed:", error.message);
  }

  const rows = (members ?? []) as { user_id: string; role: CommunityRoleTier; joined_at: string }[];
  const roleCounts = { owner: 0, admin: 0, moderator: 0, member: 0 };
  const dayCounts = new Map<string, number>();
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  let joinedLast7Days = 0;

  for (const row of rows) {
    const key = row.user_id === createdBy ? "owner" : row.role;
    roleCounts[key] += 1;
    const joinedAt = new Date(row.joined_at).getTime();
    if (now - joinedAt <= 7 * DAY) joinedLast7Days += 1;
    const dayKey = row.joined_at.slice(0, 10);
    dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
  }

  const joinsByDay: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * DAY);
    const key = d.toISOString().slice(0, 10);
    joinsByDay.push({ label: String(d.getDate()), count: dayCounts.get(key) ?? 0 });
  }

  return { memberCount: rows.length, pendingRequests: pendingRequests ?? 0, joinedLast7Days, roleCounts, joinsByDay };
}

// ============================================================================
// Join requests — only relevant for `access: "request"` communities.
// ============================================================================

export type JoinRequestRow = {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  roleTitle: string | null;
  company: string | null;
  note: string | null;
  createdAt: string;
};

const REQUEST_SELECT =
  "id, user_id, note, created_at, user:profiles!community_join_requests_user_id_fkey(full_name, avatar_url, role_title, company)";

export async function getJoinRequests(supabase: SupabaseClient, communityId: string): Promise<JoinRequestRow[]> {
  const { data, error } = await supabase
    .from("community_join_requests")
    .select(REQUEST_SELECT)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getJoinRequests failed:", error.message);
    return [];
  }

  type Row = {
    id: string;
    user_id: string;
    note: string | null;
    created_at: string;
    user: { full_name: string; avatar_url: string | null; role_title: string | null; company: string | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    fullName: r.user?.full_name ?? "Учасник",
    avatarUrl: r.user?.avatar_url ?? null,
    roleTitle: r.user?.role_title ?? null,
    company: r.user?.company ?? null,
    note: r.note,
    createdAt: r.created_at,
  }));
}

export async function approveJoinRequest(
  supabase: SupabaseClient,
  communityId: string,
  targetUserId: string,
  actorId: string
): Promise<void> {
  const { error: insertError } = await supabase.from("community_members").insert({ community_id: communityId, user_id: targetUserId });
  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: deleteError } = await supabase
    .from("community_join_requests")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", targetUserId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await logAudit(supabase, communityId, actorId, "Схвалено заявку на вступ");
}

export async function rejectJoinRequest(
  supabase: SupabaseClient,
  communityId: string,
  targetUserId: string,
  actorId: string
): Promise<void> {
  const { error } = await supabase
    .from("community_join_requests")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", targetUserId);
  if (error) {
    throw new Error(error.message);
  }
  await logAudit(supabase, communityId, actorId, "Відхилено заявку на вступ");
}

// ============================================================================
// Bans
// ============================================================================

export type BannedRow = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  reason: string | null;
  bannedByName: string | null;
  createdAt: string;
};

const BAN_SELECT =
  "user_id, reason, created_at, user:profiles!community_bans_user_id_fkey(full_name, avatar_url), banned_by_profile:profiles!community_bans_banned_by_fkey(full_name)";

export async function getBannedMembers(supabase: SupabaseClient, communityId: string): Promise<BannedRow[]> {
  const { data, error } = await supabase
    .from("community_bans")
    .select(BAN_SELECT)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getBannedMembers failed:", error.message);
    return [];
  }

  type Row = {
    user_id: string;
    reason: string | null;
    created_at: string;
    user: { full_name: string; avatar_url: string | null } | null;
    banned_by_profile: { full_name: string } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    userId: r.user_id,
    fullName: r.user?.full_name ?? "Учасник",
    avatarUrl: r.user?.avatar_url ?? null,
    reason: r.reason,
    bannedByName: r.banned_by_profile?.full_name ?? null,
    createdAt: r.created_at,
  }));
}

/** Bans and removes the member in one call — RLS (is_community_admin) keeps
 * this to owner/admin, same as the existing kick action. */
export async function banMember(
  supabase: SupabaseClient,
  communityId: string,
  targetUserId: string,
  reason: string,
  actorId: string
): Promise<void> {
  const { error: banError } = await supabase
    .from("community_bans")
    .insert({ community_id: communityId, user_id: targetUserId, reason: reason.trim() || null, banned_by: actorId });
  if (banError) {
    throw new Error(banError.message);
  }

  const { error: removeError } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", targetUserId);
  if (removeError) {
    throw new Error(removeError.message);
  }

  await logAudit(supabase, communityId, actorId, "Заблоковано учасника");
}

export async function unbanMember(supabase: SupabaseClient, communityId: string, targetUserId: string, actorId: string): Promise<void> {
  const { error } = await supabase.from("community_bans").delete().eq("community_id", communityId).eq("user_id", targetUserId);
  if (error) {
    throw new Error(error.message);
  }
  await logAudit(supabase, communityId, actorId, "Розблоковано учасника");
}

// ============================================================================
// Audit log
// ============================================================================

export type AuditRow = { id: string; action: string; actorName: string | null; createdAt: string };

const AUDIT_SELECT = "id, action, created_at, actor:profiles!community_audit_log_actor_id_fkey(full_name)";

export async function getAuditLog(supabase: SupabaseClient, communityId: string): Promise<AuditRow[]> {
  const { data, error } = await supabase
    .from("community_audit_log")
    .select(AUDIT_SELECT)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getAuditLog failed:", error.message);
    return [];
  }

  type Row = { id: string; action: string; created_at: string; actor: { full_name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    action: r.action,
    actorName: r.actor?.full_name ?? null,
    createdAt: r.created_at,
  }));
}

/** Viewer-facing role for the admin panel — "owner" is derived from
 * Community.createdBy, never a stored community_members.role value. */
export type CommunityRole = "owner" | CommunityRoleTier;

export const ROLE_UA: Record<CommunityRole, string> = {
  owner: "Власник",
  admin: "Адмін",
  moderator: "Модератор",
  member: "Учасник",
};

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "щойно";
  if (minutes < 60) return `${minutes} хв тому`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  return `${days} дн тому`;
}
