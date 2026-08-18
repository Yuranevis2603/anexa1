import type { SupabaseClient } from "@supabase/supabase-js";

export type FeedAuthor = {
  full_name: string;
  avatar_url: string | null;
  role_title: string | null;
};

export type FeedItem = {
  id: string;
  user_id: string;
  type: "post" | "article" | "comment" | "media";
  body: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  author: FeedAuthor | null;
};

export type FeedComment = {
  id: string;
  activity_item_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: FeedAuthor | null;
};

export async function getFeed(
  supabase: SupabaseClient,
  limit = 30
): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .from("activity_items")
    .select(
      "id, user_id, type, body, like_count, comment_count, created_at, author:profiles!activity_items_user_id_fkey(full_name, avatar_url, role_title)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getFeed failed:", error.message);
    return [];
  }

  return (data ?? []) as unknown as FeedItem[];
}

export async function createPost(
  supabase: SupabaseClient,
  userId: string,
  body: string
): Promise<void> {
  const { error } = await supabase.from("activity_items").insert({
    user_id: userId,
    type: "post",
    body,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Toggles the current user's like on an activity item: deletes the like row
 * if one exists, otherwise inserts one. `activity_items.like_count` is kept
 * in sync by a DB trigger, not by this function.
 */
export async function toggleLike(
  supabase: SupabaseClient,
  activityItemId: string,
  userId: string
): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from("activity_likes")
    .select("id")
    .eq("activity_item_id", activityItemId)
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existing) {
    const { error } = await supabase
      .from("activity_likes")
      .delete()
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase.from("activity_likes").insert({
    activity_item_id: activityItemId,
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Returns the ids of `activityItemIds` that `userId` has already liked, so
 * the feed can render a filled heart on first paint without a per-card query.
 */
export async function getUserLikes(
  supabase: SupabaseClient,
  userId: string,
  activityItemIds: string[]
): Promise<Set<string>> {
  if (activityItemIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("activity_likes")
    .select("activity_item_id")
    .eq("user_id", userId)
    .in("activity_item_id", activityItemIds);

  if (error) {
    console.error("getUserLikes failed:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.activity_item_id as string));
}

export async function getComments(
  supabase: SupabaseClient,
  activityItemId: string
): Promise<FeedComment[]> {
  const { data, error } = await supabase
    .from("activity_comments")
    .select(
      "id, activity_item_id, user_id, body, created_at, author:profiles!activity_comments_user_id_fkey(full_name, avatar_url, role_title)"
    )
    .eq("activity_item_id", activityItemId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getComments failed:", error.message);
    return [];
  }

  return (data ?? []) as unknown as FeedComment[];
}

export async function createComment(
  supabase: SupabaseClient,
  activityItemId: string,
  userId: string,
  body: string
): Promise<void> {
  const { error } = await supabase.from("activity_comments").insert({
    activity_item_id: activityItemId,
    user_id: userId,
    body,
  });

  if (error) {
    throw new Error(error.message);
  }
}
