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
  lastMessage: { content: string; created_at: string; sender_id: string } | null;
  unreadCount: number;
  myLastReadAt: string;
};

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
        .select("id, conversation_id, sender_id, content, created_at")
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

  const lastMessageByConversation = new Map<
    string,
    { content: string; created_at: string; sender_id: string }
  >();
  const unreadByConversation = new Map<string, number>();

  for (const m of (recentMessages ?? []) as ChatMessage[]) {
    if (!lastMessageByConversation.has(m.conversation_id)) {
      lastMessageByConversation.set(m.conversation_id, {
        content: m.content,
        created_at: m.created_at,
        sender_id: m.sender_id,
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

export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getMessages failed:", error.message);
    return [];
  }

  return (data ?? []) as ChatMessage[];
}

export async function sendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  content: string
): Promise<void> {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content,
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

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();

  if (convError || !conversation) {
    throw new Error(convError?.message ?? "Не вдалося створити розмову.");
  }

  const { error: participantsError } = await supabase.from("conversation_participants").insert([
    { conversation_id: conversation.id, user_id: userId },
    { conversation_id: conversation.id, user_id: otherUserId },
  ]);

  if (participantsError) {
    throw new Error(participantsError.message);
  }

  return conversation.id as string;
}
