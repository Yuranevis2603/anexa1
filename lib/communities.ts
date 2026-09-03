import type { SupabaseClient } from "@supabase/supabase-js";
import { trackEvent } from "./analytics";

export type CommunityRule = { title: string; body: string };
export type CommunityAccess = "public" | "request" | "private";
export type CommunitySettings = {
  approve: boolean;
  moderatePosts: boolean;
  memberEvents: boolean;
  digest: boolean;
};

const DEFAULT_SETTINGS: CommunitySettings = {
  approve: false,
  moderatePosts: false,
  memberEvents: true,
  digest: true,
};

export type Community = {
  id: string;
  name: string;
  iconUrl: string | null;
  description: string | null;
  category: string | null;
  rules: CommunityRule[];
  createdBy: string | null;
  createdAt: string;
  memberCount: number;
  isMember: boolean;
  access: CommunityAccess;
  inviteCode: string | null;
  settings: CommunitySettings;
  archivedAt: string | null;
  hasPendingRequest: boolean;
};

const COMMUNITY_COLUMNS =
  "id, name, icon_url, description, category, rules, created_by, created_at, access, invite_code, settings, archived_at";

type CommunityRow = {
  id: string;
  name: string;
  icon_url: string | null;
  description: string | null;
  category: string | null;
  rules: CommunityRule[] | null;
  created_by: string | null;
  created_at: string;
  access: CommunityAccess;
  invite_code: string | null;
  settings: Partial<CommunitySettings> | null;
  archived_at: string | null;
};

function toCommunity(row: CommunityRow, memberCount: number, isMember: boolean, hasPendingRequest = false): Community {
  return {
    id: row.id,
    name: row.name,
    iconUrl: row.icon_url,
    description: row.description,
    category: row.category,
    rules: row.rules ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    memberCount,
    isMember,
    access: row.access,
    inviteCode: row.invite_code,
    settings: { ...DEFAULT_SETTINGS, ...(row.settings ?? {}) },
    archivedAt: row.archived_at,
    hasPendingRequest,
  };
}

/** All communities with a member count and whether `userId` has joined.
 * Member counts come from the get_community_member_counts() RPC (a
 * SECURITY INVOKER group-by — same RLS-visible rows community_members'
 * select-all policy already exposes, just aggregated in Postgres instead of
 * shipping every membership row to the client). `userId`'s own memberships
 * are a plain user-scoped read (indexed via idx_community_members_user_id),
 * not a table scan. */
export async function getCommunities(supabase: SupabaseClient, userId: string): Promise<Community[]> {
  const [
    { data: communities, error: communitiesError },
    { data: memberCounts, error: countsError },
    { data: myMemberships, error: myMembershipsError },
    { data: pending, error: pendingError },
  ] = await Promise.all([
    supabase.from("communities").select(COMMUNITY_COLUMNS).order("name"),
    supabase.rpc("get_community_member_counts"),
    supabase.from("community_members").select("community_id").eq("user_id", userId),
    supabase.from("community_join_requests").select("community_id").eq("user_id", userId),
  ]);

  if (communitiesError) {
    console.error("getCommunities failed:", communitiesError.message);
    return [];
  }
  if (countsError) {
    console.error("getCommunities (member counts) failed:", countsError.message);
  }
  if (myMembershipsError) {
    console.error("getCommunities (my memberships) failed:", myMembershipsError.message);
  }
  if (pendingError) {
    console.error("getCommunities (pending) failed:", pendingError.message);
  }

  const counts = new Map<string, number>();
  for (const row of (memberCounts ?? []) as { community_id: string; member_count: number }[]) {
    counts.set(row.community_id, Number(row.member_count));
  }
  const mine = new Set(((myMemberships ?? []) as { community_id: string }[]).map((r) => r.community_id));
  const pendingIds = new Set(((pending ?? []) as { community_id: string }[]).map((p) => p.community_id));

  return ((communities ?? []) as CommunityRow[]).map((c) =>
    toCommunity(c, counts.get(c.id) ?? 0, mine.has(c.id), pendingIds.has(c.id))
  );
}

/** One community by id, with the same member count/membership shape as
 * getCommunities — for the community detail page header. Null if the
 * community doesn't exist. Count-only + single-row lookup instead of
 * reading every member row, since only the count and one membership bit
 * are actually needed here. */
export async function getCommunity(
  supabase: SupabaseClient,
  communityId: string,
  userId: string
): Promise<Community | null> {
  const [
    { data: community, error: communityError },
    { count: memberCount, error: countError },
    { data: myMembership },
    { data: pending },
  ] = await Promise.all([
    supabase.from("communities").select(COMMUNITY_COLUMNS).eq("id", communityId).maybeSingle(),
    supabase.from("community_members").select("user_id", { count: "exact", head: true }).eq("community_id", communityId),
    supabase.from("community_members").select("user_id").eq("community_id", communityId).eq("user_id", userId).maybeSingle(),
    supabase.from("community_join_requests").select("id").eq("community_id", communityId).eq("user_id", userId).maybeSingle(),
  ]);

  if (communityError || !community) {
    if (communityError) console.error("getCommunity failed:", communityError.message);
    return null;
  }
  if (countError) {
    console.error("getCommunity (member count) failed:", countError.message);
  }

  return toCommunity(community as CommunityRow, memberCount ?? 0, Boolean(myMembership), Boolean(pending));
}

/** Creates a community owned by `userId` (the created_by unique index caps
 * this at one per creator — a second attempt fails with a 23505) and joins
 * its creator to it right away. */
export async function createCommunity(
  supabase: SupabaseClient,
  userId: string,
  fields: {
    name: string;
    iconUrl: string | null;
    description?: string | null;
    category?: string | null;
    access?: CommunityAccess;
  }
): Promise<Community> {
  const { data, error } = await supabase
    .from("communities")
    .insert({
      name: fields.name,
      icon_url: fields.iconUrl,
      description: fields.description ?? null,
      category: fields.category ?? null,
      access: fields.access ?? "public",
      created_by: userId,
    })
    .select(COMMUNITY_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ви вже створили спільноту — можна мати лише одну.");
    }
    throw new Error(error.message);
  }

  await joinCommunity(supabase, userId, (data as CommunityRow).id);

  return toCommunity(data as CommunityRow, 1, true);
}

export type CommunityEditableFields = {
  name: string;
  description: string | null;
  category: string | null;
  rules: CommunityRule[];
};

/** Owner-only edit ("Керувати спільнотою") — RLS enforces created_by = auth.uid(). */
export async function updateCommunity(
  supabase: SupabaseClient,
  communityId: string,
  fields: CommunityEditableFields
): Promise<CommunityEditableFields> {
  const { error } = await supabase
    .from("communities")
    .update({
      name: fields.name,
      description: fields.description,
      category: fields.category,
      rules: fields.rules,
    })
    .eq("id", communityId);

  if (error) {
    throw new Error(error.message);
  }

  return fields;
}

/** The single call site behind every "join" UI in the app (CommunityCard,
 * CommunityDetailView, and createCommunity's own auto-join of its creator),
 * so this is also where the `first_community_join` activation event fires —
 * one check here instead of one per caller. */
export async function joinCommunity(supabase: SupabaseClient, userId: string, communityId: string): Promise<void> {
  const { count: priorCount } = await supabase
    .from("community_members")
    .select("community_id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { error } = await supabase.from("community_members").insert({ community_id: communityId, user_id: userId });
  if (error) {
    throw new Error(error.message);
  }

  if ((priorCount ?? 0) === 0) {
    void trackEvent(supabase, userId, "first_community_join");
  }
}

/** Used for `access: "request"` communities — a manager decides from the
 * "Заявки" tab instead of joining instantly. */
export async function requestToJoinCommunity(
  supabase: SupabaseClient,
  userId: string,
  communityId: string,
  note?: string
): Promise<void> {
  const { error } = await supabase
    .from("community_join_requests")
    .insert({ community_id: communityId, user_id: userId, note: note?.trim() || null });
  if (error) {
    if (error.code === "23505") {
      throw new Error("Заявку вже подано.");
    }
    throw new Error(error.message);
  }
}

export async function cancelJoinRequest(supabase: SupabaseClient, userId: string, communityId: string): Promise<void> {
  const { error } = await supabase
    .from("community_join_requests")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function leaveCommunity(supabase: SupabaseClient, userId: string, communityId: string): Promise<void> {
  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
}

/** Community-level staff role — separate from `roleTitle` (the member's own
 * job title, e.g. "CEO"). Owner isn't a value here; it's derived from
 * Community.createdBy and exposed via `isOwner`. */
export type CommunityRoleTier = "admin" | "moderator" | "member";

export type CommunityMember = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  roleTitle: string | null;
  company: string | null;
  isOwner: boolean;
  communityRole: CommunityRoleTier;
  joinedAt: string;
};

/** Member directory for the "Учасники" tab — owner first, then by join
 * date. `ownerId` comes from the already-fetched Community (createdBy),
 * so this doesn't need its own community lookup. */
export async function getCommunityMembers(
  supabase: SupabaseClient,
  communityId: string,
  ownerId: string | null
): Promise<CommunityMember[]> {
  const { data, error } = await supabase
    .from("community_members")
    .select(
      "user_id, joined_at, role, profile:profiles!community_members_user_id_fkey(full_name, avatar_url, role_title, company)"
    )
    .eq("community_id", communityId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("getCommunityMembers failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as {
    user_id: string;
    joined_at: string;
    role: CommunityRoleTier;
    profile: { full_name: string; avatar_url: string | null; role_title: string | null; company: string | null } | null;
  }[];

  const members = rows.map((r) => ({
    userId: r.user_id,
    fullName: r.profile?.full_name ?? "Учасник ANEXA",
    avatarUrl: r.profile?.avatar_url ?? null,
    roleTitle: r.profile?.role_title ?? null,
    company: r.profile?.company ?? null,
    isOwner: r.user_id === ownerId,
    communityRole: r.role,
    joinedAt: r.joined_at,
  }));

  members.sort((a, b) => (a.isOwner === b.isOwner ? 0 : a.isOwner ? -1 : 1));
  return members;
}

/** Owner-only — RLS (community_members_update_role_owner) enforces it. */
export async function setMemberRole(
  supabase: SupabaseClient,
  communityId: string,
  userId: string,
  role: CommunityRoleTier
): Promise<void> {
  const { error } = await supabase
    .from("community_members")
    .update({ role })
    .eq("community_id", communityId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

/** Removes a member from the community. RLS restricts this to the owner
 * (any member/admin) or an Admin (plain members only — not other admins,
 * not the owner). */
export async function kickMember(supabase: SupabaseClient, communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

/** Total post count for the sidebar's "Постів" stat. */
export async function getCommunityPostCount(supabase: SupabaseClient, communityId: string): Promise<number> {
  const { count, error } = await supabase
    .from("activity_items")
    .select("id", { count: "exact", head: true })
    .eq("community_id", communityId);

  if (error) {
    console.error("getCommunityPostCount failed:", error.message);
    return 0;
  }

  return count ?? 0;
}

/** Per-member contribution count (posts + discussion threads + replies) for
 * the Members tab's "N внесків" line and the sidebar's "Найактивніші"
 * leaderboard. Three lightweight id-only reads, aggregated client-side —
 * same approach as getCommunities' member counts. */
export async function getMemberActivityCounts(
  supabase: SupabaseClient,
  communityId: string
): Promise<Map<string, number>> {
  const [{ data: posts, error: postsError }, { data: threads, error: threadsError }] = await Promise.all([
    supabase.from("activity_items").select("user_id").eq("community_id", communityId),
    supabase.from("discussion_threads").select("id, user_id").eq("community_id", communityId),
  ]);

  if (postsError) console.error("getMemberActivityCounts (posts) failed:", postsError.message);
  if (threadsError) console.error("getMemberActivityCounts (threads) failed:", threadsError.message);

  const threadRows = (threads ?? []) as { id: string; user_id: string }[];
  const threadIds = threadRows.map((t) => t.id);

  const { data: replies, error: repliesError } =
    threadIds.length > 0
      ? await supabase.from("discussion_replies").select("user_id").in("thread_id", threadIds)
      : { data: [] as { user_id: string }[], error: null };
  if (repliesError) console.error("getMemberActivityCounts (replies) failed:", repliesError.message);

  const counts = new Map<string, number>();
  const bump = (userId: string) => counts.set(userId, (counts.get(userId) ?? 0) + 1);

  for (const row of (posts ?? []) as { user_id: string }[]) bump(row.user_id);
  for (const row of threadRows) bump(row.user_id);
  for (const row of (replies ?? []) as { user_id: string }[]) bump(row.user_id);

  return counts;
}

/** Owner/Admin-only (communities_update_admins). Scoped update — unlike
 * `updateCommunity`, doesn't require the caller to also resend rules. */
export async function updateCommunityProfile(
  supabase: SupabaseClient,
  communityId: string,
  fields: { name: string; description: string | null; category: string | null }
): Promise<void> {
  const { error } = await supabase
    .from("communities")
    .update({ name: fields.name, description: fields.description, category: fields.category })
    .eq("id", communityId);
  if (error) {
    throw new Error(error.message);
  }
}

/** Owner/Admin-only (communities_update_admins). */
export async function updateCommunityRules(supabase: SupabaseClient, communityId: string, rules: CommunityRule[]): Promise<void> {
  const { error } = await supabase.from("communities").update({ rules }).eq("id", communityId);
  if (error) {
    throw new Error(error.message);
  }
}

/** Owner/Admin-only (communities_update_admins) — access mode, invite link
 * regeneration, and publish-settings toggles, gathered in the "Керувати →
 * Доступ" tab. */
export async function updateCommunityAccess(supabase: SupabaseClient, communityId: string, access: CommunityAccess): Promise<void> {
  const { error } = await supabase.from("communities").update({ access }).eq("id", communityId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateCommunitySettings(supabase: SupabaseClient, communityId: string, settings: CommunitySettings): Promise<void> {
  const { error } = await supabase.from("communities").update({ settings }).eq("id", communityId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function regenerateInviteCode(supabase: SupabaseClient, communityId: string): Promise<string> {
  const code = Math.random().toString(36).slice(2, 8);
  const { error } = await supabase.from("communities").update({ invite_code: code }).eq("id", communityId);
  if (error) {
    throw new Error(error.message);
  }
  return code;
}

/** Owner-only (communities_delete_owner doesn't apply here — archiving is
 * just an update). Closes posting/joining but keeps history. */
export async function archiveCommunity(supabase: SupabaseClient, communityId: string): Promise<void> {
  const { error } = await supabase.from("communities").update({ archived_at: new Date().toISOString() }).eq("id", communityId);
  if (error) {
    throw new Error(error.message);
  }
}

/** Owner-only. Cascades to memberships, join requests, bans and the audit
 * log. Community-scoped events/posts/discussions/livestreams reference
 * communities.id without cascade, so deleting a community that has any of
 * those fails with a foreign-key error instead of silently wiping its
 * content history — archive it instead if it's not empty. */
export async function deleteCommunity(supabase: SupabaseClient, communityId: string): Promise<void> {
  const { error } = await supabase.from("communities").delete().eq("id", communityId);
  if (error) {
    throw new Error(error.message);
  }
}

/** Ukrainian pluralization for the "N учасників" community card line. */
export function formatMemberCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "учасник"
      : mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)
        ? "учасники"
        : "учасників";
  return `${count} ${word}`;
}
