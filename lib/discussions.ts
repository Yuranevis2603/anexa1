import type { SupabaseClient } from "@supabase/supabase-js";

export type DiscussionThread = {
  id: string;
  communityId: string;
  userId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  topic: string | null;
  title: string;
  body: string | null;
  pinned: boolean;
  replyCount: number;
  createdAt: string;
};

export type DiscussionReply = {
  id: string;
  threadId: string;
  userId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
};

const THREAD_SELECT =
  "id, community_id, user_id, topic, title, body, pinned, reply_count, created_at, author:profiles!discussion_threads_user_id_fkey(full_name, avatar_url)";

type ThreadRow = {
  id: string;
  community_id: string;
  user_id: string;
  topic: string | null;
  title: string;
  body: string | null;
  pinned: boolean;
  reply_count: number;
  created_at: string;
  author: { full_name: string; avatar_url: string | null } | null;
};

function toThread(row: ThreadRow): DiscussionThread {
  return {
    id: row.id,
    communityId: row.community_id,
    userId: row.user_id,
    authorName: row.author?.full_name ?? "Учасник ANEXA",
    authorAvatarUrl: row.author?.avatar_url ?? null,
    topic: row.topic,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    replyCount: row.reply_count,
    createdAt: row.created_at,
  };
}

/** Threads for a community's "Обговорення" tab — pinned first, then newest. */
export async function getThreads(supabase: SupabaseClient, communityId: string): Promise<DiscussionThread[]> {
  const { data, error } = await supabase
    .from("discussion_threads")
    .select(THREAD_SELECT)
    .eq("community_id", communityId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getThreads failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as ThreadRow[]).map(toThread);
}

export async function createThread(
  supabase: SupabaseClient,
  userId: string,
  communityId: string,
  fields: { topic: string | null; title: string; body: string | null }
): Promise<DiscussionThread> {
  const { data, error } = await supabase
    .from("discussion_threads")
    .insert({
      community_id: communityId,
      user_id: userId,
      topic: fields.topic,
      title: fields.title,
      body: fields.body,
    })
    .select(THREAD_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toThread(data as unknown as ThreadRow);
}

/** Pin/unpin — RLS restricts this to the thread's author or the community owner. */
export async function setThreadPinned(supabase: SupabaseClient, threadId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from("discussion_threads").update({ pinned }).eq("id", threadId);
  if (error) {
    throw new Error(error.message);
  }
}

const REPLY_SELECT =
  "id, thread_id, user_id, body, created_at, author:profiles!discussion_replies_user_id_fkey(full_name, avatar_url)";

type ReplyRow = {
  id: string;
  thread_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: { full_name: string; avatar_url: string | null } | null;
};

function toReply(row: ReplyRow): DiscussionReply {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    authorName: row.author?.full_name ?? "Учасник ANEXA",
    authorAvatarUrl: row.author?.avatar_url ?? null,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function getReplies(supabase: SupabaseClient, threadId: string): Promise<DiscussionReply[]> {
  const { data, error } = await supabase
    .from("discussion_replies")
    .select(REPLY_SELECT)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getReplies failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as ReplyRow[]).map(toReply);
}

export async function addReply(
  supabase: SupabaseClient,
  threadId: string,
  userId: string,
  body: string
): Promise<void> {
  const { error } = await supabase.from("discussion_replies").insert({ thread_id: threadId, user_id: userId, body });
  if (error) {
    throw new Error(error.message);
  }
}
