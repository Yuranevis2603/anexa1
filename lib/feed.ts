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
