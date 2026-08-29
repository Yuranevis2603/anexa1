import type { SupabaseClient } from "@supabase/supabase-js";

export type PendingProfile = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  roleTitle: string | null;
  company: string | null;
  createdAt: string;
};

/** Members whose closed-beta profile hasn't been approved yet, oldest
 * signup first. Plain table select — `profiles` is readable by any
 * authenticated user, only the approve action itself is admin-gated. */
export async function getPendingProfiles(supabase: SupabaseClient): Promise<PendingProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role_title, company, created_at")
    .eq("is_approved", false)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getPendingProfiles failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    roleTitle: row.role_title,
    company: row.company,
    createdAt: row.created_at,
  }));
}

/** Marks a member's profile approved. Server-side checks the caller is a
 * platform admin (via RLS-bypassing RPC) — the client-side gate on the page
 * is only a convenience, not the real access control. */
export async function approveProfile(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase.rpc("approve_profile", { p_user_id: userId });
  if (error) {
    throw new Error(error.message);
  }
}

export type AdminUser = {
  id: string;
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  roleTitle: string | null;
  company: string | null;
  isApproved: boolean;
  isPlatformAdmin: boolean;
  createdAt: string;
  communityCount: number;
};

/** Every member for the admin Users table, newest signup first, with a
 * community-membership count. Two plain reads (profiles is select-all for
 * authenticated users; community_members likewise) aggregated client-side —
 * same approach as getCommunities, fine at this scale. Nothing here exposes
 * ax_points/email: those aren't readable cross-account (see
 * profile_gamification RLS) or don't exist on `profiles` at all. */
export async function getAdminUsers(supabase: SupabaseClient): Promise<AdminUser[]> {
  const [{ data: profiles, error: profilesError }, { data: members, error: membersError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, role_title, company, is_approved, is_platform_admin, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("community_members").select("user_id"),
  ]);

  if (profilesError) {
    console.error("getAdminUsers failed:", profilesError.message);
    return [];
  }
  if (membersError) console.error("getAdminUsers (members) failed:", membersError.message);

  const counts = new Map<string, number>();
  for (const row of (members ?? []) as { user_id: string }[]) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }

  return (profiles ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    roleTitle: row.role_title,
    company: row.company,
    isApproved: row.is_approved,
    isPlatformAdmin: row.is_platform_admin,
    createdAt: row.created_at,
    communityCount: counts.get(row.id) ?? 0,
  }));
}

export type AdminCommunity = {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string | null;
  ownerName: string;
  memberCount: number;
  postCount: number;
  createdAt: string;
  archivedAt: string | null;
};

/** Communities for the admin table — member/post counts aggregated
 * client-side from the same select-all tables the regular Communities page
 * already reads (see lib/communities.ts's getCommunities for the pattern). */
export async function getAdminCommunities(supabase: SupabaseClient): Promise<AdminCommunity[]> {
  const [
    { data: communities, error: communitiesError },
    { data: members, error: membersError },
    { data: posts, error: postsError },
  ] = await Promise.all([
    supabase
      .from("communities")
      .select("id, name, icon_url, created_by, created_at, archived_at, owner:profiles!communities_created_by_fkey(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("community_members").select("community_id"),
    supabase.from("activity_items").select("community_id").not("community_id", "is", null),
  ]);

  if (communitiesError) {
    console.error("getAdminCommunities failed:", communitiesError.message);
    return [];
  }
  if (membersError) console.error("getAdminCommunities (members) failed:", membersError.message);
  if (postsError) console.error("getAdminCommunities (posts) failed:", postsError.message);

  const memberCounts = new Map<string, number>();
  for (const row of (members ?? []) as { community_id: string }[]) {
    memberCounts.set(row.community_id, (memberCounts.get(row.community_id) ?? 0) + 1);
  }
  const postCounts = new Map<string, number>();
  for (const row of (posts ?? []) as { community_id: string }[]) {
    postCounts.set(row.community_id, (postCounts.get(row.community_id) ?? 0) + 1);
  }

  type Row = {
    id: string;
    name: string;
    icon_url: string | null;
    created_by: string | null;
    created_at: string;
    archived_at: string | null;
    owner: { full_name: string } | null;
  };

  return ((communities ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    iconUrl: row.icon_url,
    ownerId: row.created_by,
    ownerName: row.owner?.full_name ?? "—",
    memberCount: memberCounts.get(row.id) ?? 0,
    postCount: postCounts.get(row.id) ?? 0,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  }));
}

export type AdminOverviewStats = {
  totalUsers: number;
  pendingUsers: number;
  totalCommunities: number;
  newUsersThisWeek: number;
  signupsByDay: { label: string; count: number }[];
  recentUsers: PendingProfile[];
};

/** Real KPIs for the admin Overview page — total/pending users, community
 * count, a 30-day signup trend (bucketed client-side from created_at), and
 * the most recent signups for the "Останні події" feed. No revenue/payment
 * figures: this app has no billing tables yet, so those aren't invented. */
export async function getAdminOverviewStats(supabase: SupabaseClient): Promise<AdminOverviewStats> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    { count: totalUsers, error: totalError },
    { count: pendingUsers, error: pendingError },
    { count: totalCommunities, error: communitiesError },
    { data: recentSignups, error: signupsError },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_approved", false),
    supabase.from("communities").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role_title, company, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false }),
  ]);

  for (const [label, err] of [
    ["total", totalError],
    ["pending", pendingError],
    ["communities", communitiesError],
    ["signups", signupsError],
  ] as const) {
    if (err) console.error(`getAdminOverviewStats (${label}) failed:`, err.message);
  }

  const rows = (recentSignups ?? []) as { id: string; full_name: string; avatar_url: string | null; role_title: string | null; company: string | null; created_at: string }[];

  const WEEK_AGO = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newUsersThisWeek = rows.filter((r) => new Date(r.created_at).getTime() >= WEEK_AGO).length;

  const buckets = new Array(30).fill(0);
  const now = Date.now();
  for (const r of rows) {
    const daysAgo = Math.floor((now - new Date(r.created_at).getTime()) / (24 * 60 * 60 * 1000));
    const bucket = 29 - daysAgo;
    if (bucket >= 0 && bucket < 30) buckets[bucket] += 1;
  }
  const signupsByDay = buckets.map((count, i) => ({ label: String(i + 1), count }));

  return {
    totalUsers: totalUsers ?? 0,
    pendingUsers: pendingUsers ?? 0,
    totalCommunities: totalCommunities ?? 0,
    newUsersThisWeek,
    signupsByDay,
    recentUsers: rows.slice(0, 6).map((r) => ({
      id: r.id,
      fullName: r.full_name,
      avatarUrl: r.avatar_url,
      roleTitle: r.role_title,
      company: r.company,
      createdAt: r.created_at,
    })),
  };
}
