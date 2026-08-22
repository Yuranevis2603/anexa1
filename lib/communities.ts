import type { SupabaseClient } from "@supabase/supabase-js";

export type Community = {
  id: string;
  name: string;
  iconUrl: string | null;
  createdBy: string | null;
  memberCount: number;
  isMember: boolean;
};

/** All communities with a member count and whether `userId` has joined.
 * Both tables are select-all for authenticated members (see schema.sql),
 * so this is two plain reads plus a client-side aggregation — no RPC
 * needed at this scale. */
export async function getCommunities(supabase: SupabaseClient, userId: string): Promise<Community[]> {
  const [{ data: communities, error: communitiesError }, { data: members, error: membersError }] = await Promise.all([
    supabase.from("communities").select("id, name, icon_url, created_by").order("name"),
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

  return (
    (communities ?? []) as { id: string; name: string; icon_url: string | null; created_by: string | null }[]
  ).map((c) => ({
    id: c.id,
    name: c.name,
    iconUrl: c.icon_url,
    createdBy: c.created_by,
    memberCount: counts.get(c.id) ?? 0,
    isMember: mine.has(c.id),
  }));
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
    supabase.from("communities").select("id, name, icon_url, created_by").eq("id", communityId).maybeSingle(),
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
  const c = community as { id: string; name: string; icon_url: string | null; created_by: string | null };

  return {
    id: c.id,
    name: c.name,
    iconUrl: c.icon_url,
    createdBy: c.created_by,
    memberCount: rows.length,
    isMember: rows.some((r) => r.user_id === userId),
  };
}

/** Creates a community owned by `userId` (the created_by unique index caps
 * this at one per creator — a second attempt fails with a 23505) and joins
 * its creator to it right away. */
export async function createCommunity(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  iconUrl: string | null
): Promise<Community> {
  const { data, error } = await supabase
    .from("communities")
    .insert({ name, icon_url: iconUrl, created_by: userId })
    .select("id, name, icon_url, created_by")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ви вже створили спільноту — можна мати лише одну.");
    }
    throw new Error(error.message);
  }

  const community = data as { id: string; name: string; icon_url: string | null; created_by: string | null };

  await joinCommunity(supabase, userId, community.id);

  return {
    id: community.id,
    name: community.name,
    iconUrl: community.icon_url,
    createdBy: community.created_by,
    memberCount: 1,
    isMember: true,
  };
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
