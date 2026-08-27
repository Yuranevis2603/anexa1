import type { SupabaseClient } from "@supabase/supabase-js";

export type FollowUser = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  roleTitle: string | null;
  company: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role_title: string | null;
  company: string | null;
};

const PROFILE_SELECT = "id, full_name, avatar_url, role_title, company";

function toFollowUser(row: ProfileRow): FollowUser {
  return {
    id: row.id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    roleTitle: row.role_title,
    company: row.company,
  };
}

export async function getFollowCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<{ followers: number; following: number }> {
  const [followers, following] = await Promise.all([
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", userId),
    supabase.from("follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);

  if (followers.error) console.error("getFollowCounts (followers) failed:", followers.error.message);
  if (following.error) console.error("getFollowCounts (following) failed:", following.error.message);

  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

/** Members who follow `userId`, newest first. */
export async function getFollowers(supabase: SupabaseClient, userId: string): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from("follows")
    .select(`follower:profiles!follows_follower_id_fkey(${PROFILE_SELECT})`)
    .eq("followee_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getFollowers failed:", error.message);
    return [];
  }

  return (data as unknown as { follower: ProfileRow }[]).map((row) => toFollowUser(row.follower));
}

/** Members `userId` follows, newest first. */
export async function getFollowing(supabase: SupabaseClient, userId: string): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from("follows")
    .select(`followee:profiles!follows_followee_id_fkey(${PROFILE_SELECT})`)
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getFollowing failed:", error.message);
    return [];
  }

  return (data as unknown as { followee: ProfileRow }[]).map((row) => toFollowUser(row.followee));
}

export async function isFollowing(
  supabase: SupabaseClient,
  followerId: string,
  followeeId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId)
    .maybeSingle();

  if (error) {
    console.error("isFollowing failed:", error.message);
    return false;
  }

  return Boolean(data);
}

export async function follow(supabase: SupabaseClient, followerId: string, followeeId: string): Promise<void> {
  const { error } = await supabase.from("follows").insert({ follower_id: followerId, followee_id: followeeId });
  if (error) {
    throw new Error(error.message);
  }
}

export async function unfollow(supabase: SupabaseClient, followerId: string, followeeId: string): Promise<void> {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId);

  if (error) {
    throw new Error(error.message);
  }
}
