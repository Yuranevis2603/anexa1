import type { SupabaseClient } from "@supabase/supabase-js";

export type FollowCounts = {
  followers: number;
  following: number;
};

/** Row counts for both directions of the follow graph around one member. */
export async function getFollowCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<FollowCounts> {
  const [{ count: followers, error: followersError }, { count: following, error: followingError }] =
    await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_id", userId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
    ]);

  if (followersError) console.error("getFollowCounts (followers) failed:", followersError.message);
  if (followingError) console.error("getFollowCounts (following) failed:", followingError.message);

  return { followers: followers ?? 0, following: following ?? 0 };
}

/** Whether `followerId` already follows `followeeId`. */
export async function isFollowing(
  supabase: SupabaseClient,
  followerId: string,
  followeeId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId)
    .maybeSingle();

  if (error) {
    console.error("isFollowing failed:", error.message);
    return false;
  }

  return data !== null;
}

/** Inserts or deletes the follow row; returns the new following state. */
export async function toggleFollow(
  supabase: SupabaseClient,
  followerId: string,
  followeeId: string,
  currentlyFollowing: boolean
): Promise<boolean> {
  if (currentlyFollowing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("followee_id", followeeId);

    if (error) throw new Error(error.message);
    return false;
  }

  const { error } = await supabase.from("follows").insert({
    follower_id: followerId,
    followee_id: followeeId,
  });

  if (error) throw new Error(error.message);
  return true;
}
