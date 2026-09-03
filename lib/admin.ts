import type { SupabaseClient } from "@supabase/supabase-js";
import { invalidateLevelsCache } from "./gamification";

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

export type AdminUserStatusFilter = "all" | "active" | "pending";

export type AdminUsersPage = {
  users: AdminUser[];
  /** Total matching rows across every page — for the pager and the "N із M" label. */
  total: number;
  /** Pending-approval count across the whole table (not just this page) —
   * cheap now via idx_profiles_is_approved. */
  pendingTotal: number;
  page: number;
  pageSize: number;
};

export const ADMIN_USERS_PAGE_SIZE = 25;

/** One page of members for the admin Users table, newest signup first —
 * search/status-filtered and paginated server-side via `.range()` +
 * `{count:"exact"}` instead of loading the entire `profiles` table. The
 * community-membership count is scoped to just this page's user ids via
 * `.in()` (same pattern as getUserLikes/getUserSaves), not the whole
 * community_members table. Nothing here exposes ax_points/email: those
 * aren't readable cross-account (see profile_gamification RLS) or don't
 * exist on `profiles` at all. */
export async function getAdminUsers(
  supabase: SupabaseClient,
  options?: { search?: string; status?: AdminUserStatusFilter; page?: number; pageSize?: number }
): Promise<AdminUsersPage> {
  const page = Math.max(options?.page ?? 1, 1);
  const pageSize = options?.pageSize ?? ADMIN_USERS_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, role_title, company, is_approved, is_platform_admin, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  const term = options?.search?.trim();
  if (term) {
    const like = `%${term}%`;
    query = query.or(`full_name.ilike.${like},username.ilike.${like}`);
  }
  if (options?.status === "active") query = query.eq("is_approved", true);
  if (options?.status === "pending") query = query.eq("is_approved", false);

  const [{ data: profiles, count, error: profilesError }, { count: pendingTotal, error: pendingError }] =
    await Promise.all([
      query,
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_approved", false),
    ]);

  if (profilesError) {
    console.error("getAdminUsers failed:", profilesError.message);
    return { users: [], total: 0, pendingTotal: 0, page, pageSize };
  }
  if (pendingError) console.error("getAdminUsers (pending total) failed:", pendingError.message);

  const pageUserIds = (profiles ?? []).map((p) => p.id as string);
  const { data: members, error: membersError } =
    pageUserIds.length > 0
      ? await supabase.from("community_members").select("user_id").in("user_id", pageUserIds)
      : { data: [] as { user_id: string }[], error: null };
  if (membersError) console.error("getAdminUsers (members) failed:", membersError.message);

  const counts = new Map<string, number>();
  for (const row of (members ?? []) as { user_id: string }[]) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }

  const users = (profiles ?? []).map((row) => ({
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

  return { users, total: count ?? 0, pendingTotal: pendingTotal ?? 0, page, pageSize };
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

/** Communities for the admin table — member/post counts come from the
 * get_community_member_counts()/get_community_post_counts() RPCs (SECURITY
 * INVOKER group-by aggregates in Postgres) instead of reading every
 * community_members/activity_items row to count client-side. */
export async function getAdminCommunities(supabase: SupabaseClient): Promise<AdminCommunity[]> {
  const [
    { data: communities, error: communitiesError },
    { data: memberCounts, error: membersError },
    { data: postCountRows, error: postsError },
  ] = await Promise.all([
    supabase
      .from("communities")
      .select("id, name, icon_url, created_by, created_at, archived_at, owner:profiles!communities_created_by_fkey(full_name)")
      .order("created_at", { ascending: false }),
    supabase.rpc("get_community_member_counts"),
    supabase.rpc("get_community_post_counts"),
  ]);

  if (communitiesError) {
    console.error("getAdminCommunities failed:", communitiesError.message);
    return [];
  }
  if (membersError) console.error("getAdminCommunities (member counts) failed:", membersError.message);
  if (postsError) console.error("getAdminCommunities (post counts) failed:", postsError.message);

  const memberCountMap = new Map<string, number>();
  for (const row of (memberCounts ?? []) as { community_id: string; member_count: number }[]) {
    memberCountMap.set(row.community_id, Number(row.member_count));
  }
  const postCounts = new Map<string, number>();
  for (const row of (postCountRows ?? []) as { community_id: string; post_count: number }[]) {
    postCounts.set(row.community_id, Number(row.post_count));
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
    memberCount: memberCountMap.get(row.id) ?? 0,
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

export type AdminPost = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  type: string;
  postType: string | null;
  likeCount: number;
  commentCount: number;
  communityId: string | null;
  createdAt: string;
};

/** Every post for the admin moderation table, newest first. activity_items
 * is select-all for authenticated users (see schema.sql), so this is a
 * plain read — only the delete action needs the admin_delete_post RPC. */
export async function getAdminPosts(supabase: SupabaseClient, limit = 200): Promise<AdminPost[]> {
  const { data, error } = await supabase
    .from("activity_items")
    .select(
      "id, body, type, post_type, like_count, comment_count, community_id, created_at, user_id, author:profiles!activity_items_user_id_fkey(full_name, avatar_url)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getAdminPosts failed:", error.message);
    return [];
  }

  type Row = {
    id: string;
    body: string;
    type: string;
    post_type: string | null;
    like_count: number;
    comment_count: number;
    community_id: string | null;
    created_at: string;
    user_id: string;
    author: { full_name: string; avatar_url: string | null } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    body: row.body,
    authorId: row.user_id,
    authorName: row.author?.full_name ?? "Учасник ANEXA",
    authorAvatarUrl: row.author?.avatar_url ?? null,
    type: row.type,
    postType: row.post_type,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    communityId: row.community_id,
    createdAt: row.created_at,
  }));
}

/** Deletes any post regardless of author — platform-admin only, enforced
 * server-side by the admin_delete_post RPC (bypasses the owner-only /
 * community-staff-only delete RLS). */
export async function adminDeletePost(supabase: SupabaseClient, postId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_delete_post", { p_post_id: postId });
  if (error) {
    throw new Error(error.message);
  }
}

export type AdminAxStats = {
  totalAxEarned: number;
  totalAxBalance: number;
  topEarners: { id: string; fullName: string; axPoints: number }[];
};

/** Platform-wide AX circulation + top earners — profile_gamification is
 * select-own only via RLS, so this goes through the admin_get_ax_stats RPC. */
export async function getAdminAxStats(supabase: SupabaseClient): Promise<AdminAxStats> {
  const { data, error } = await supabase.rpc("admin_get_ax_stats");
  if (error) {
    console.error("getAdminAxStats failed:", error.message);
    return { totalAxEarned: 0, totalAxBalance: 0, topEarners: [] };
  }
  const result = data as { totalAxEarned: number; totalAxBalance: number; topEarners: { id: string; fullName: string; axPoints: number }[] };
  return {
    totalAxEarned: result?.totalAxEarned ?? 0,
    totalAxBalance: result?.totalAxBalance ?? 0,
    topEarners: result?.topEarners ?? [],
  };
}

/** Edits an existing level's title/threshold, or adds a new one. levels has
 * no admin-write RLS policy (select-all only), so this goes through the
 * admin_upsert_level RPC. Clears getLevels()'s in-process cache afterward —
 * previously that cache was never invalidated, so an admin's edit here
 * silently never reached anyone until the server process restarted. */
export async function adminUpsertLevel(supabase: SupabaseClient, level: number, title: string, minAx: number): Promise<void> {
  const { error } = await supabase.rpc("admin_upsert_level", { p_level: level, p_title: title, p_min_ax: minAx });
  if (error) {
    throw new Error(error.message);
  }
  invalidateLevelsCache();
}

export const ADMIN_AX_GRANT_MAX = 1000;

/** Manually credits AX to one member — platform-admin only, capped at
 * ADMIN_AX_GRANT_MAX per call (also enforced server-side in
 * admin_grant_ax, so this client-side cap is only a convenience). */
export async function adminGrantAx(supabase: SupabaseClient, userId: string, amount: number, note?: string): Promise<void> {
  const { error } = await supabase.rpc("admin_grant_ax", { p_user_id: userId, p_amount: amount, p_note: note || null });
  if (error) {
    throw new Error(error.message);
  }
}

/** Manually deducts AX from one member — symmetric to adminGrantAx, same
 * ADMIN_AX_GRANT_MAX cap, floored at 0 server-side so it can never go
 * negative. */
export async function adminDeductAx(supabase: SupabaseClient, userId: string, amount: number, note?: string): Promise<void> {
  const { error } = await supabase.rpc("admin_deduct_ax", { p_user_id: userId, p_amount: amount, p_note: note || null });
  if (error) {
    throw new Error(error.message);
  }
}

/** Uncached read of the levels table for the admin Settings page —
 * lib/gamification.ts's getLevels() caches per-process on the assumption
 * levels rarely change, which no longer holds now that admins can edit
 * them here. */
export async function getAdminLevels(supabase: SupabaseClient): Promise<{ level: number; title: string; min_ax: number }[]> {
  const { data, error } = await supabase.from("levels").select("level, title, min_ax").order("level");
  if (error) {
    console.error("getAdminLevels failed:", error.message);
    return [];
  }
  return data ?? [];
}

export type AdminEvent = {
  id: string;
  title: string;
  eventDate: string;
  communityId: string | null;
  communityName: string | null;
  registrationCount: number;
};

export type AdminLivestream = {
  id: string;
  title: string;
  communityId: string;
  communityName: string;
  hostName: string;
  status: "live" | "ended";
  startedAt: string;
};

/** Upcoming events and today's livestreams across every community.
 * Registrations are scoped to the fetched events via `.in()` instead of
 * reading the entire event_registrations table. */
export async function getAdminEventsAndLive(
  supabase: SupabaseClient
): Promise<{ events: AdminEvent[]; livestreams: AdminLivestream[] }> {
  const [{ data: events, error: eventsError }, { data: streams, error: streamsError }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, event_date, community_id, community:communities(name)")
      .order("event_date", { ascending: true })
      .limit(100),
    supabase
      .from("community_livestreams")
      .select("id, title, community_id, status, started_at, community:communities(name), host:profiles!community_livestreams_host_id_fkey(full_name)")
      .order("started_at", { ascending: false })
      .limit(50),
  ]);

  if (eventsError) console.error("getAdminEventsAndLive (events) failed:", eventsError.message);
  if (streamsError) console.error("getAdminEventsAndLive (streams) failed:", streamsError.message);

  const eventIds = ((events ?? []) as { id: string }[]).map((e) => e.id);

  const { data: regs, error: regsError } =
    eventIds.length > 0
      ? await supabase.from("event_registrations").select("event_id").in("event_id", eventIds).neq("status", "cancelled")
      : { data: [] as { event_id: string }[], error: null };

  if (regsError) console.error("getAdminEventsAndLive (registrations) failed:", regsError.message);

  const regCounts = new Map<string, number>();
  for (const row of (regs ?? []) as { event_id: string }[]) {
    regCounts.set(row.event_id, (regCounts.get(row.event_id) ?? 0) + 1);
  }

  type EventRow = { id: string; title: string; event_date: string; community_id: string | null; community: { name: string } | null };
  type StreamRow = {
    id: string;
    title: string;
    community_id: string;
    status: "live" | "ended";
    started_at: string;
    community: { name: string } | null;
    host: { full_name: string } | null;
  };

  return {
    events: ((events ?? []) as unknown as EventRow[]).map((e) => ({
      id: e.id,
      title: e.title,
      eventDate: e.event_date,
      communityId: e.community_id,
      communityName: e.community?.name ?? null,
      registrationCount: regCounts.get(e.id) ?? 0,
    })),
    livestreams: ((streams ?? []) as unknown as StreamRow[]).map((s) => ({
      id: s.id,
      title: s.title,
      communityId: s.community_id,
      communityName: s.community?.name ?? "—",
      hostName: s.host?.full_name ?? "—",
      status: s.status,
      startedAt: s.started_at,
    })),
  };
}

export type AdminAnalytics = {
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  totalConnections: number;
  totalFollows: number;
  postsByDay: { label: string; count: number }[];
};

/** Broader engagement numbers for the Аналітика page — same select-all
 * tables as the rest of the app, just aggregated for everyone instead of
 * one profile. */
export async function getAdminAnalytics(supabase: SupabaseClient): Promise<AdminAnalytics> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    { count: totalPosts, error: postsError },
    { count: totalComments, error: commentsError },
    { count: totalLikes, error: likesError },
    { count: totalConnections, error: connectionsError },
    { count: totalFollows, error: followsError },
    { data: recentPosts, error: recentError },
  ] = await Promise.all([
    supabase.from("activity_items").select("id", { count: "exact", head: true }).eq("type", "post"),
    supabase.from("activity_comments").select("id", { count: "exact", head: true }),
    supabase.from("activity_likes").select("id", { count: "exact", head: true }),
    supabase.from("connections").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }),
    supabase.from("activity_items").select("created_at").eq("type", "post").gte("created_at", since.toISOString()),
  ]);

  for (const [label, err] of [
    ["posts", postsError],
    ["comments", commentsError],
    ["likes", likesError],
    ["connections", connectionsError],
    ["follows", followsError],
    ["recent", recentError],
  ] as const) {
    if (err) console.error(`getAdminAnalytics (${label}) failed:`, err.message);
  }

  const rows = (recentPosts ?? []) as { created_at: string }[];
  const buckets = new Array(30).fill(0);
  const now = Date.now();
  for (const r of rows) {
    const daysAgo = Math.floor((now - new Date(r.created_at).getTime()) / (24 * 60 * 60 * 1000));
    const bucket = 29 - daysAgo;
    if (bucket >= 0 && bucket < 30) buckets[bucket] += 1;
  }

  return {
    totalPosts: totalPosts ?? 0,
    totalComments: totalComments ?? 0,
    totalLikes: totalLikes ?? 0,
    totalConnections: totalConnections ?? 0,
    totalFollows: totalFollows ?? 0,
    postsByDay: buckets.map((count, i) => ({ label: String(i + 1), count })),
  };
}

/** Sends one notification (with custom title/body) to every member —
 * platform-admin only, via the admin_broadcast_notification RPC. Returns
 * how many members actually received it. */
export async function adminBroadcastNotification(supabase: SupabaseClient, title: string, body: string): Promise<number> {
  const { data, error } = await supabase.rpc("admin_broadcast_notification", { p_title: title, p_body: body || null });
  if (error) {
    throw new Error(error.message);
  }
  return (data as number) ?? 0;
}

export type AdminAuditLogEntry = {
  id: string;
  adminName: string;
  action: string;
  targetType: string | null;
  detail: string | null;
  createdAt: string;
};

/** Every admin action logged via log_admin_action(), newest first —
 * platform-admin only (see admin_audit_log_select_admin RLS policy). */
export async function getAdminAuditLog(supabase: SupabaseClient, limit = 100): Promise<AdminAuditLogEntry[]> {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("id, action, target_type, detail, created_at, admin:profiles!admin_audit_log_admin_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getAdminAuditLog failed:", error.message);
    return [];
  }

  type Row = { id: string; action: string; target_type: string | null; detail: string | null; created_at: string; admin: { full_name: string } | null };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    adminName: row.admin?.full_name ?? "—",
    action: row.action,
    targetType: row.target_type,
    detail: row.detail,
    createdAt: row.created_at,
  }));
}
