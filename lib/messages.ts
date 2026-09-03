import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MessageParticipant = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role_title: string | null;
  company: string | null;
};

export type ConversationSummary = {
  id: string;
  otherParticipant: MessageParticipant | null;
  lastMessage: {
    content: string;
    created_at: string;
    sender_id: string;
    attachment_name: string | null;
    attachment_type: string | null;
  } | null;
  unreadCount: number;
  myLastReadAt: string;
};

/** Short label for a conversation-list preview when a message has no text. */
export function attachmentPreviewLabel(name: string | null, type: string | null): string {
  if (type?.startsWith("image/")) return "📷 Фото";
  return `📎 ${name ?? "Файл"}`;
}

/** "4.2 MB" / "820 KB" for attachment file-size display. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Compact relative time for the conversation list ("14:32", "Вчора", "3 дн тому"). */
export function formatChatListTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (dayDiff <= 0) {
    return date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
  }
  if (dayDiff === 1) return "Вчора";
  if (dayDiff < 7) return `${dayDiff} дн тому`;
  return date.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
}

/** Full time for message bubbles ("14:32"). */
export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
}

/** Date-separator label for the thread ("Сьогодні", "Вчора", "12 серпня"). */
export function formatDaySeparator(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (dayDiff === 0) return "Сьогодні";
  if (dayDiff === 1) return "Вчора";
  return date.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
}

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
};

const PARTICIPANT_SELECT = "id, full_name, avatar_url, role_title, company";
const RECENT_MESSAGES_SCAN = 500; // enough to derive "last message" + unread counts at this scale

/**
 * Every conversation the member is part of, newest activity first, with the
 * other 1:1 participant, last message preview, and an unread count derived
 * from conversation_participants.last_read_at (no per-message read table).
 */
export async function getConversations(
  supabase: SupabaseClient,
  userId: string
): Promise<ConversationSummary[]> {
  const { data: myRows, error: myError } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  if (myError || !myRows || myRows.length === 0) {
    if (myError) console.error("getConversations failed:", myError.message);
    return [];
  }

  const conversationIds = myRows.map((r) => r.conversation_id as string);
  const lastReadByConversation = new Map(
    myRows.map((r) => [r.conversation_id as string, r.last_read_at as string])
  );

  const [{ data: otherRows, error: otherError }, { data: recentMessages, error: msgError }] =
    await Promise.all([
      supabase
        .from("conversation_participants")
        .select(`conversation_id, user_id, profile:profiles(${PARTICIPANT_SELECT})`)
        .in("conversation_id", conversationIds)
        .neq("user_id", userId),
      supabase
        .from("messages")
        .select("id, conversation_id, sender_id, content, created_at, attachment_name, attachment_type")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(RECENT_MESSAGES_SCAN),
    ]);

  if (otherError) console.error("getConversations (participants) failed:", otherError.message);
  if (msgError) console.error("getConversations (messages) failed:", msgError.message);

  const otherByConversation = new Map(
    ((otherRows ?? []) as unknown as { conversation_id: string; profile: MessageParticipant | null }[]).map(
      (r) => [r.conversation_id, r.profile]
    )
  );

  const lastMessageByConversation = new Map<string, NonNullable<ConversationSummary["lastMessage"]>>();
  const unreadByConversation = new Map<string, number>();

  for (const m of (recentMessages ?? []) as ChatMessage[]) {
    if (!lastMessageByConversation.has(m.conversation_id)) {
      lastMessageByConversation.set(m.conversation_id, {
        content: m.content,
        created_at: m.created_at,
        sender_id: m.sender_id,
        attachment_name: m.attachment_name ?? null,
        attachment_type: m.attachment_type ?? null,
      });
    }
    const myLastRead = lastReadByConversation.get(m.conversation_id);
    if (m.sender_id !== userId && myLastRead && m.created_at > myLastRead) {
      unreadByConversation.set(m.conversation_id, (unreadByConversation.get(m.conversation_id) ?? 0) + 1);
    }
  }

  const summaries: ConversationSummary[] = conversationIds.map((id) => ({
    id,
    otherParticipant: otherByConversation.get(id) ?? null,
    lastMessage: lastMessageByConversation.get(id) ?? null,
    unreadCount: unreadByConversation.get(id) ?? 0,
    myLastReadAt: lastReadByConversation.get(id) ?? new Date(0).toISOString(),
  }));

  summaries.sort((a, b) => {
    const aTime = a.lastMessage?.created_at ?? "";
    const bTime = b.lastMessage?.created_at ?? "";
    return bTime.localeCompare(aTime);
  });

  return summaries;
}

/** Total unread messages across every conversation — powers the sidebar badge. */
export async function getTotalUnreadCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const conversations = await getConversations(supabase, userId);
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

/** Same as getTotalUnreadCount, memoized per request via React cache() —
 * for Server Components only. app/dashboard/layout.tsx and
 * DashboardOverview.tsx both need this count in the same request; without
 * this it ran getConversations() (3 queries, incl. a scan of up to
 * RECENT_MESSAGES_SCAN messages) twice per /dashboard load. Client
 * Components (e.g. the presence provider's live badge) must keep using
 * plain getTotalUnreadCount — cache() isn't for Client Component use. */
export const getCachedTotalUnreadCount = cache(getTotalUnreadCount);

const MESSAGE_SELECT =
  "id, conversation_id, sender_id, content, created_at, attachment_path, attachment_name, attachment_type, attachment_size";

export const MESSAGES_PAGE_SIZE = 50;

/** Most recent page of a conversation's messages (oldest→newest, ready to
 * render), plus whether older ones exist. Previously fetched the entire
 * conversation with no limit at all — fine for a short chat, but an
 * unbounded multi-year thread would ship its whole history on every open.
 * Pass `before` (the oldest currently-loaded message's created_at) to page
 * further back. */
export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string,
  options?: { before?: string }
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  let query = supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGES_PAGE_SIZE + 1);

  if (options?.before) {
    query = query.lt("created_at", options.before);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getMessages failed:", error.message);
    return { messages: [], hasMore: false };
  }

  const rows = (data ?? []) as ChatMessage[];
  const hasMore = rows.length > MESSAGES_PAGE_SIZE;
  const page = rows.slice(0, MESSAGES_PAGE_SIZE).reverse();
  return { messages: page, hasMore };
}

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export type MessageAttachment = {
  path: string;
  name: string;
  type: string;
  size: number;
};

/** Uploads a chat attachment; path is scoped by conversation for the storage RLS to key off. */
export async function uploadMessageAttachment(
  supabase: SupabaseClient,
  conversationId: string,
  file: File
): Promise<MessageAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("Файл завеликий (максимум 15 МБ).");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("message-attachments").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { path, name: file.name, type: file.type || "application/octet-stream", size: file.size };
}

/** Batch-signs attachment paths (private bucket — no public URL) for rendering a page of messages. */
export async function getSignedAttachmentUrls(
  supabase: SupabaseClient,
  paths: string[]
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from("message-attachments")
    .createSignedUrls(paths, 60 * 60);

  if (error) {
    console.error("getSignedAttachmentUrls failed:", error.message);
    return new Map();
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.signedUrl && !row.error) {
      map.set(row.path ?? "", row.signedUrl);
    }
  }
  return map;
}

export async function sendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  content: string,
  attachment?: MessageAttachment | null
): Promise<void> {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    attachment_path: attachment?.path ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_type: attachment?.type ?? null,
    attachment_size: attachment?.size ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getParticipantLastRead(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select("last_read_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getParticipantLastRead failed:", error.message);
    return null;
  }

  return (data?.last_read_at as string | undefined) ?? null;
}

export async function markConversationRead(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) {
    console.error("markConversationRead failed:", error.message);
  }
}

/**
 * Finds an existing 1:1 conversation between the two members, or creates one.
 * Not wrapped in a DB transaction (client has no RPC for it), so a rare race
 * between two simultaneous "message this person" clicks could create two
 * conversations — harmless duplication, not a correctness/security issue.
 */
export async function getOrCreateConversation(
  supabase: SupabaseClient,
  userId: string,
  otherUserId: string
): Promise<string> {
  const { data: mine, error: mineError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (mineError) throw new Error(mineError.message);

  const myConversationIds = (mine ?? []).map((r) => r.conversation_id as string);

  if (myConversationIds.length > 0) {
    const { data: shared, error: sharedError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myConversationIds)
      .limit(1)
      .maybeSingle();

    if (sharedError) throw new Error(sharedError.message);
    if (shared) return shared.conversation_id as string;
  }

  // conversations_select_participant requires an existing participant row,
  // which can't exist yet for a brand-new conversation — so reading the row
  // back via .select() right after inserting it would be RLS-blocked (0 rows
  // in RETURNING), and PostgREST rolls the whole insert back when a
  // singular response can't be produced. Sidestep that chicken-and-egg
  // problem entirely by generating the id client-side instead of reading it
  // back from the database.
  const conversationId = crypto.randomUUID();
  const { error: convError } = await supabase.from("conversations").insert({ id: conversationId });

  if (convError) {
    throw new Error(convError.message);
  }

  // Two separate inserts, not a single batched one: the "insert others into a
  // conversation I'm already in" RLS branch checks for my own participant
  // row via EXISTS, which isn't visible yet to a sibling row in the same
  // multi-row INSERT statement — it only sees rows committed by prior
  // statements.
  const { error: myParticipantError } = await supabase
    .from("conversation_participants")
    .insert({ conversation_id: conversationId, user_id: userId });

  if (myParticipantError) {
    throw new Error(myParticipantError.message);
  }

  const { error: otherParticipantError } = await supabase
    .from("conversation_participants")
    .insert({ conversation_id: conversationId, user_id: otherUserId });

  if (otherParticipantError) {
    throw new Error(otherParticipantError.message);
  }

  return conversationId;
}
