import type { SupabaseClient } from "@supabase/supabase-js";

export type Community = {
  id: string;
  name: string;
  iconUrl: string | null;
  description: string | null;
  category: string | null;
  createdBy: string | null;
  createdAt: string;
  memberCount: number;
  isMember: boolean;
};

const COMMUNITY_COLUMNS = "id, name, icon_url, description, category, created_by, created_at";

type CommunityRow = {
  id: string;
  name: string;
  icon_url: string | null;
  description: string | null;
  category: string | null;
  created_by: string | null;
  created_at: string;
};

function toCommunity(row: CommunityRow, memberCount: number, isMember: boolean): Community {
  return {
    id: row.id,
    name: row.name,
    iconUrl: row.icon_url,
    description: row.description,
    category: row.category,
    createdBy: row.created_by,
    createdAt: row.created_at,
    memberCount,
    isMember,
  };
}

/** All communities with a member count and whether `userId` has joined.
 * Both tables are select-all for authenticated members (see schema.sql),
 * so this is two plain reads plus a client-side aggregation — no RPC
 * needed at this scale. */
export async function getCommunities(supabase: SupabaseClient, userId: string): Promise<Community[]> {
  const [{ data: communities, error: communitiesError }, { data: members, error: membersError }] = await Promise.all([
    supabase.from("communities").select(COMMUNITY_COLUMNS).order("name"),
    supabase.from("community_members").select("community_id, user_id"),
  ]);

  if (communitiesError) {
    console.error("getCommunities failed:", communitiesError.message);
    return [];
  }
  if (membersError) {
    console.error("getCommunities (members) failed:", membersError.message);
  }

  const rows = (members ?? []) as { community_id: string; user_id: string }[];
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const row of rows) {
    counts.set(row.community_id, (counts.get(row.community_id) ?? 0) + 1);
    if (row.user_id === userId) mine.add(row.community_id);
  }

  return ((communities ?? []) as CommunityRow[]).map((c) =>
    toCommunity(c, counts.get(c.id) ?? 0, mine.has(c.id))
  );
}

/** One community by id, with the same member count/membership shape as
 * getCommunities — for the community detail page header. Null if the
 * community doesn't exist. */
export async function getCommunity(
  supabase: SupabaseClient,
  communityId: string,
  userId: string
): Promise<Community | null> {
  const [{ data: community, error: communityError }, { data: members, error: membersError }] = await Promise.all([
    supabase.from("communities").select(COMMUNITY_COLUMNS).eq("id", communityId).maybeSingle(),
    supabase.from("community_members").select("user_id").eq("community_id", communityId),
  ]);

  if (communityError || !community) {
    if (communityError) console.error("getCommunity failed:", communityError.message);
    return null;
  }
  if (membersError) {
    console.error("getCommunity (members) failed:", membersError.message);
  }

  const rows = (members ?? []) as { user_id: string }[];
  return toCommunity(community as CommunityRow, rows.length, rows.some((r) => r.user_id === userId));
}

/** Creates a community owned by `userId` (the created_by unique index caps
 * this at one per creator — a second attempt fails with a 23505) and joins
 * its creator to it right away. */
export async function createCommunity(
  supabase: SupabaseClient,
  userId: string,
  fields: { name: string; iconUrl: string | null; description?: string | null; category?: string | null }
): Promise<Community> {
  const { data, error } = await supabase
    .from("communities")
    .insert({
      name: fields.name,
      icon_url: fields.iconUrl,
      description: fields.description ?? null,
      category: fields.category ?? null,
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

export async function joinCommunity(supabase: SupabaseClient, userId: string, communityId: string): Promise<void> {
  const { error } = await supabase.from("community_members").insert({ community_id: communityId, user_id: userId });
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

export type CommunityMember = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  roleTitle: string | null;
  company: string | null;
  isOwner: boolean;
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
    .select("user_id, joined_at, profile:profiles!community_members_user_id_fkey(full_name, avatar_url, role_title, company)")
    .eq("community_id", communityId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("getCommunityMembers failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as {
    user_id: string;
    joined_at: string;
    profile: { full_name: string; avatar_url: string | null; role_title: string | null; company: string | null } | null;
  }[];

  const members = rows.map((r) => ({
    userId: r.user_id,
    fullName: r.profile?.full_name ?? "Учасник ANEXA",
    avatarUrl: r.profile?.avatar_url ?? null,
    roleTitle: r.profile?.role_title ?? null,
    company: r.profile?.company ?? null,
    isOwner: r.user_id === ownerId,
    joinedAt: r.joined_at,
  }));

  members.sort((a, b) => (a.isOwner === b.isOwner ? 0 : a.isOwner ? -1 : 1));
  return members;
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
