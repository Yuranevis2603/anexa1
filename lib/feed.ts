import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./profile";

// ============================================================================
// Business post types — the core of the ANEXA Feed (section 3 of the brief).
// ============================================================================
export const POST_TYPES = [
  { value: "idea", emoji: "💡", label: "Ідея" },
  { value: "project", emoji: "🚀", label: "Проєкт" },
  { value: "partner", emoji: "🤝", label: "Шукаю партнера" },
  { value: "specialist", emoji: "👨‍💻", label: "Шукаю спеціаліста" },
  { value: "opportunity", emoji: "💰", label: "Можливість" },
  { value: "result", emoji: "🏆", label: "Результат" },
] as const;

export type PostType = (typeof POST_TYPES)[number]["value"];

export function postTypeMeta(postType: string | null) {
  return POST_TYPES.find((t) => t.value === postType) ?? null;
}

export const CTA_TYPES = [
  { value: "contact", label: "Написати" },
  { value: "collaborate", label: "Запропонувати співпрацю" },
  { value: "join", label: "Приєднатися" },
  { value: "learn_more", label: "Дізнатися більше" },
] as const;

export type CtaType = (typeof CTA_TYPES)[number]["value"];

export function ctaLabel(cta: string | null) {
  return CTA_TYPES.find((c) => c.value === cta)?.label ?? null;
}

export const WORK_FORMATS = [
  { value: "remote", label: "Віддалено" },
  { value: "office", label: "В офісі" },
  { value: "hybrid", label: "Гібридно" },
] as const;

export type WorkFormat = (typeof WORK_FORMATS)[number]["value"];

export function workFormatLabel(format: string | null) {
  return WORK_FORMATS.find((f) => f.value === format)?.label ?? null;
}

export type FeedFilter = "for_you" | "new" | "opportunities" | "projects" | "requests" | "saved";

// "saved" is deliberately excluded here — it has its own sidebar entry and
// page (/dashboard/saved) instead of living as a pill in this row.
export const FEED_FILTERS: { value: FeedFilter; label: string }[] = [
  { value: "for_you", label: "Для тебе" },
  { value: "new", label: "Нові" },
  { value: "opportunities", label: "Можливості" },
  { value: "projects", label: "Проєкти" },
  { value: "requests", label: "Запити" },
];

const FILTER_POST_TYPES: Partial<Record<FeedFilter, PostType[]>> = {
  opportunities: ["opportunity"],
  projects: ["project"],
  requests: ["partner", "specialist"],
};

export type FeedAuthor = {
  full_name: string;
  avatar_url: string | null;
  role_title: string | null;
  username: string | null;
  membership_tier: string | null;
};

export type Poll = {
  id: string;
  options: string[];
  /** Vote count per option, same order as options. */
  counts: number[];
  total: number;
  /** The viewing user's chosen option index, or null if they haven't voted
   * (or no viewer id was passed to the fetch that returned this item). */
  myVote: number | null;
};

export type FeedItem = {
  id: string;
  user_id: string;
  type: "post" | "article" | "comment" | "media";
  post_type: PostType | null;
  body: string;
  image_url: string | null;
  category: string | null;
  budget: string | null;
  work_format: WorkFormat | null;
  cta_type: CtaType | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  author: FeedAuthor | null;
  poll: Poll | null;
};

export type FeedComment = {
  id: string;
  activity_item_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: FeedAuthor | null;
};

const FEED_SELECT =
  "id, user_id, type, post_type, body, image_url, category, budget, work_format, cta_type, like_count, comment_count, created_at, author:profiles!activity_items_user_id_fkey(full_name, avatar_url, role_title, username, membership_tier), poll:post_polls(id, options)";

type RawFeedRow = Omit<FeedItem, "poll"> & { poll: { id: string; options: string[] } | null };

/** Batch-fills the vote counts (and, if `viewerId` is given, that viewer's
 * own vote) for every poll among `rows` — one query for the whole page
 * instead of one per post. */
async function attachPollResults(
  supabase: SupabaseClient,
  rows: RawFeedRow[],
  viewerId?: string
): Promise<FeedItem[]> {
  const pollIds = rows.map((r) => r.poll?.id).filter((id): id is string => Boolean(id));
  if (pollIds.length === 0) {
    return rows.map((r) => ({ ...r, poll: null }));
  }

  const { data, error } = await supabase
    .from("post_poll_votes")
    .select("poll_id, option_index, user_id")
    .in("poll_id", pollIds);

  if (error) {
    console.error("attachPollResults failed:", error.message);
  }

  const votes = (data ?? []) as { poll_id: string; option_index: number; user_id: string }[];
  const byPoll = new Map<string, typeof votes>();
  for (const vote of votes) {
    const bucket = byPoll.get(vote.poll_id) ?? [];
    bucket.push(vote);
    byPoll.set(vote.poll_id, bucket);
  }

  return rows.map((r) => {
    if (!r.poll) return { ...r, poll: null };
    const bucket = byPoll.get(r.poll.id) ?? [];
    const counts = new Array(r.poll.options.length).fill(0);
    let myVote: number | null = null;
    for (const vote of bucket) {
      if (vote.option_index >= 0 && vote.option_index < counts.length) counts[vote.option_index]++;
      if (viewerId && vote.user_id === viewerId) myVote = vote.option_index;
    }
    return { ...r, poll: { id: r.poll.id, options: r.poll.options, counts, total: bucket.length, myVote } };
  });
}

/** Small "recent activity" feed for a single member's own profile page. */
export async function getUserActivity(
  supabase: SupabaseClient,
  userId: string,
  limit = 6,
  viewerId?: string
): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .from("activity_items")
    .select(FEED_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getUserActivity failed:", error.message);
    return [];
  }

  return attachPollResults(supabase, (data ?? []) as unknown as RawFeedRow[], viewerId);
}

/** Single post by id — for permalinks (e.g. a like/comment notification
 * deep-linking to the exact post instead of the general feed). */
export async function getPostById(supabase: SupabaseClient, id: string, viewerId?: string): Promise<FeedItem | null> {
  const { data, error } = await supabase.from("activity_items").select(FEED_SELECT).eq("id", id).maybeSingle();

  if (error) {
    console.error("getPostById failed:", error.message);
    return null;
  }
  if (!data) return null;

  const [item] = await attachPollResults(supabase, [data as unknown as RawFeedRow], viewerId);
  return item;
}

export const FEED_PAGE_SIZE = 10;
// "Для тебе" ranks within a bounded pool instead of the whole table — keeps
// the personalization pass cheap while still avoiding "load everything".
export const FOR_YOU_POOL_SIZE = 60;

/**
 * Chronological, server-paginated feed page for a given filter (everything
 * except "for_you", which is ranked client-side over a bounded pool — see
 * getForYouPool). Uses range() so only one page is ever transferred.
 */
export async function getFeedPage(
  supabase: SupabaseClient,
  {
    filter,
    page = 0,
    pageSize = FEED_PAGE_SIZE,
    viewerId,
  }: { filter: FeedFilter; page?: number; pageSize?: number; viewerId?: string }
): Promise<{ items: FeedItem[]; hasMore: boolean }> {
  // Community posts (community_id set) live only on their community's own
  // page — keep them out of the global Feed.
  let query = supabase
    .from("activity_items")
    .select(FEED_SELECT)
    .is("community_id", null)
    .order("created_at", { ascending: false });

  const postTypes = FILTER_POST_TYPES[filter];
  if (postTypes) {
    query = query.in("post_type", postTypes);
  }

  const from = page * pageSize;
  // Fetch one extra row to know whether another page exists, without a
  // separate count query.
  const to = from + pageSize;
  const { data, error } = await query.range(from, to);

  if (error) {
    console.error("getFeedPage failed:", error.message);
    return { items: [], hasMore: false };
  }

  const rows = (data ?? []) as unknown as RawFeedRow[];
  const hasMore = rows.length > pageSize;
  const items = await attachPollResults(supabase, rows.slice(0, pageSize), viewerId);
  return { items, hasMore };
}

export async function getForYouPool(
  supabase: SupabaseClient,
  poolSize = FOR_YOU_POOL_SIZE,
  viewerId?: string
): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .from("activity_items")
    .select(FEED_SELECT)
    .is("community_id", null)
    .order("created_at", { ascending: false })
    .limit(poolSize);

  if (error) {
    console.error("getForYouPool failed:", error.message);
    return [];
  }

  return attachPollResults(supabase, (data ?? []) as unknown as RawFeedRow[], viewerId);
}

/** Posts made inside one community's "Стрічка" tab — kept out of the
 * global Feed (see getFeedPage/getForYouPool). Not paginated; a
 * community's own feed is small enough at this scale to fetch in one go. */
export async function getCommunityFeed(
  supabase: SupabaseClient,
  communityId: string,
  limit = 50,
  viewerId?: string
): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .from("activity_items")
    .select(FEED_SELECT)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getCommunityFeed failed:", error.message);
    return [];
  }

  return attachPollResults(supabase, (data ?? []) as unknown as RawFeedRow[], viewerId);
}

/**
 * Server-paginated "🔖 Збережені" tab: the member's own saved_posts joined
 * back to the full post, ordered by when it was saved (not when it was
 * posted).
 */
export async function getSavedFeedPage(
  supabase: SupabaseClient,
  { userId, page = 0, pageSize = FEED_PAGE_SIZE }: { userId: string; page?: number; pageSize?: number }
): Promise<{ items: FeedItem[]; hasMore: boolean }> {
  const from = page * pageSize;
  const to = from + pageSize;

  const { data, error } = await supabase
    .from("saved_posts")
    .select(`activity_item:activity_items(${FEED_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("getSavedFeedPage failed:", error.message);
    return { items: [], hasMore: false };
  }

  const rows = ((data ?? []) as unknown as { activity_item: RawFeedRow | null }[])
    .map((row) => row.activity_item)
    .filter((item): item is RawFeedRow => item !== null);

  const hasMore = rows.length > pageSize;
  const items = await attachPollResults(supabase, rows.slice(0, pageSize), userId);
  return { items, hasMore };
}

function scorePost(item: FeedItem, tags: Set<string>): number {
  if (tags.size === 0) return 0;

  let score = 0;
  const category = item.category?.toLowerCase().trim();
  const body = item.body.toLowerCase();

  for (const tag of tags) {
    if (category && (category.includes(tag) || tag.includes(category))) score += 3;
    if (body.includes(tag)) score += 1;
  }

  return score;
}

/**
 * Basic overlap-based personalization for the "Для тебе" tab: posts whose
 * category/body match the member's interests, skills, industries or
 * business goals rank higher; everything else keeps its chronological
 * order (stable sort), which is also the full fallback when the member has
 * no profile signal at all. `scorePost` is the only place a future AI
 * recommendation engine needs to change — the rest of the pipeline
 * (fetch pool -> score -> stable sort -> paginate) stays the same.
 */
export function personalizeFeed(items: FeedItem[], profile: Profile | null): FeedItem[] {
  if (!profile) return items;

  const tags = new Set(
    [
      ...(profile.interests ?? []),
      ...(profile.skills ?? []),
      ...(profile.industries ?? []),
      ...(profile.business_goals ?? []),
    ]
      .map((t) => t.toLowerCase().trim())
      .filter(Boolean)
  );

  if (tags.size === 0) return items; // chronological fallback

  return items
    .map((item, index) => ({ item, index, score: scorePost(item, tags) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}

export type CreatePostInput = {
  postType: PostType;
  body: string;
  imageUrl?: string | null;
  category?: string | null;
  budget?: string | null;
  workFormat?: WorkFormat | null;
  ctaType?: CtaType | null;
  /** Scopes the post to a community's own feed instead of the global one. */
  communityId?: string | null;
  /** 2–6 option labels — attaches a poll to the post. */
  poll?: string[] | null;
};

export async function createPost(
  supabase: SupabaseClient,
  userId: string,
  input: CreatePostInput
): Promise<void> {
  const { data, error } = await supabase
    .from("activity_items")
    .insert({
      user_id: userId,
      type: "post",
      post_type: input.postType,
      body: input.body,
      image_url: input.imageUrl ?? null,
      category: input.category ?? null,
      budget: input.budget ?? null,
      work_format: input.workFormat ?? null,
      cta_type: input.ctaType ?? null,
      community_id: input.communityId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (input.poll && input.poll.length >= 2) {
    const { error: pollError } = await supabase
      .from("post_polls")
      .insert({ activity_item_id: (data as { id: string }).id, options: input.poll });
    if (pollError) {
      throw new Error(pollError.message);
    }
  }
}

/** Casts or changes the current user's vote on a poll. */
export async function votePoll(
  supabase: SupabaseClient,
  pollId: string,
  userId: string,
  optionIndex: number
): Promise<void> {
  const { error } = await supabase
    .from("post_poll_votes")
    .upsert({ poll_id: pollId, user_id: userId, option_index: optionIndex }, { onConflict: "poll_id,user_id" });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePost(supabase: SupabaseClient, postId: string): Promise<void> {
  const { error } = await supabase.from("activity_items").delete().eq("id", postId);
  if (error) {
    throw new Error(error.message);
  }
}

const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadPostImage(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  if (file.size > MAX_POST_IMAGE_BYTES) {
    throw new Error("Зображення завелике (максимум 5 МБ).");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("post-images").getPublicUrl(path);
  return data.publicUrl;
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
    const { error } = await supabase.from("activity_likes").delete().eq("id", existing.id);
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

/** Same shape as getUserLikes, but for saved_posts ("🔖 Зберегти"). */
export async function getUserSaves(
  supabase: SupabaseClient,
  userId: string,
  activityItemIds: string[]
): Promise<Set<string>> {
  if (activityItemIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("saved_posts")
    .select("activity_item_id")
    .eq("user_id", userId)
    .in("activity_item_id", activityItemIds);

  if (error) {
    console.error("getUserSaves failed:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.activity_item_id as string));
}

export async function toggleSave(
  supabase: SupabaseClient,
  activityItemId: string,
  userId: string
): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from("saved_posts")
    .select("id")
    .eq("activity_item_id", activityItemId)
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existing) {
    const { error } = await supabase.from("saved_posts").delete().eq("id", existing.id);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase.from("saved_posts").insert({
    activity_item_id: activityItemId,
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getComments(
  supabase: SupabaseClient,
  activityItemId: string
): Promise<FeedComment[]> {
  const { data, error } = await supabase
    .from("activity_comments")
    .select(
      "id, activity_item_id, user_id, body, created_at, author:profiles!activity_comments_user_id_fkey(full_name, avatar_url, role_title, username, membership_tier)"
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

export async function deleteComment(supabase: SupabaseClient, commentId: string): Promise<void> {
  const { error } = await supabase.from("activity_comments").delete().eq("id", commentId);
  if (error) {
    throw new Error(error.message);
  }
}
