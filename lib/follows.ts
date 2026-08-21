import type { SupabaseClient } from "@supabase/supabase-js";

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
