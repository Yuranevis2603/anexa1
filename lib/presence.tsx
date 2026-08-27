"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTotalUnreadCount } from "@/lib/messages";

const OnlineUsersContext = createContext<Set<string>>(new Set());

/**
 * Joins the single shared "who's online" Presence channel once per session
 * (mounted high in the dashboard shell) and exposes the resulting set of
 * online member ids to any descendant via useOnlineUsers().
 */
export function OnlinePresenceProvider({
  userId,
  hideOnlineStatus = false,
  children,
}: {
  userId: string | undefined;
  /** Settings → Приватність toggle: still see who else is online, just
   * never broadcast this member's own presence key. */
  hideOnlineStatus?: boolean;
  children: React.ReactNode;
}) {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase.channel("presence:online", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && !hideOnlineStatus) {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, hideOnlineStatus]);

  return <OnlineUsersContext.Provider value={online}>{children}</OnlineUsersContext.Provider>;
}

export function useOnlineUsers(): Set<string> {
  return useContext(OnlineUsersContext);
}

/**
 * Ephemeral (non-persisted) typing indicator for one open conversation,
 * broadcast over a per-conversation Presence channel.
 */
export function useTypingPresence(
  conversationId: string | undefined,
  userId: string | undefined
): { otherIsTyping: boolean; notifyTyping: () => void } {
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOtherIsTyping(false);
    if (!conversationId || !userId) return;

    const supabase = createClient();
    const channel = supabase.channel(`presence:typing:${conversationId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ typing: boolean }>();
        const someoneElseTyping = Object.entries(state).some(
          ([key, presences]) => key !== userId && presences.some((p) => p.typing)
        );
        setOtherIsTyping(someoneElseTyping);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ typing: false });
        }
      });

    return () => {
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, userId]);

  function notifyTyping() {
    const channel = channelRef.current;
    if (!channel) return;

    channel.track({ typing: true });

    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    stopTimeoutRef.current = setTimeout(() => {
      channel.track({ typing: false });
    }, 2500);
  }

  return { otherIsTyping, notifyTyping };
}

/**
 * Live "Повідомлення" sidebar badge: seeds from the server-rendered count,
 * then refetches on any message insert Realtime delivers to this session
 * (Realtime enforces the same RLS as normal queries, so this only ever
 * fires for messages in conversations the member is actually part of).
 */
export function useUnreadMessagesBadge(userId: string | undefined, initialCount: number): number {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("messages:badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        getTotalUnreadCount(supabase, userId).then(setCount);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return count;
}
