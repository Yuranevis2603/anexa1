import type { SupabaseClient } from "@supabase/supabase-js";
import { getBlockedUserIds } from "./moderation";
import { getConnectionStates, type ConnectionState } from "./connections";
import { getFollowingSet } from "./follows";

export type MemberSearchResult = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  roleTitle: string | null;
  company: string | null;
  location: string | null;
  industries: string[];
  connection: ConnectionState;
  following: boolean;
};

type ProfileRow = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role_title: string | null;
  company: string | null;
  location: string | null;
  industries: string[] | null;
};

const MEMBER_SELECT = "id, full_name, avatar_url, role_title, company, location, industries";

/**
 * "Знайти людей" — searches every approved ANEXA member (not just the
 * viewer's existing network), unlike getFriends/getRecommendedPeople which
 * are both scoped to a specific relationship. A blank query still returns
 * members (newest first) so the tab has something to browse before typing;
 * location/industry filters apply client-side over this result set, the
 * same pattern FriendsView already uses for its company filter.
 */
export async function searchMembers(
  supabase: SupabaseClient,
  viewerId: string,
  query: string,
  limit: number = 60
): Promise<MemberSearchResult[]> {
  const term = query.trim();

  let request = supabase
    .from("profiles")
    .select(MEMBER_SELECT)
    .eq("is_approved", true)
    .is("deletion_requested_at", null)
    .neq("id", viewerId);

  if (term.length >= 2) {
    const like = `%${term}%`;
    request = request.or(`full_name.ilike.${like},username.ilike.${like},company.ilike.${like}`);
  }

  request = term.length >= 2 ? request.order("full_name") : request.order("created_at", { ascending: false });

  const { data, error } = await request.limit(limit);

  if (error) {
    console.error("searchMembers failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as ProfileRow[];
  const blockedByMe = await getBlockedUserIds(supabase, viewerId);
  const visible = rows.filter((r) => !blockedByMe.has(r.id));
  const ids = visible.map((r) => r.id);

  const [connectionStates, followingSet] = await Promise.all([
    getConnectionStates(supabase, viewerId, ids),
    getFollowingSet(supabase, viewerId, ids),
  ]);

  return visible.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    roleTitle: row.role_title,
    company: row.company,
    location: row.location,
    industries: row.industries ?? [],
    connection: connectionStates.get(row.id) ?? { status: "none" },
    following: followingSet.has(row.id),
  }));
}
