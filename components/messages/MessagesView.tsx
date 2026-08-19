"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getConversations, type ConversationSummary } from "@/lib/messages";
import { useOnlineUsers } from "@/lib/presence";
import ChatListItem from "./ChatListItem";
import ChatThread from "./ChatThread";

export default function MessagesView({
  userId,
  initialConversations,
}: {
  userId: string;
  initialConversations: ConversationSummary[];
}) {
  const searchParams = useSearchParams();
  const deepLinkId = searchParams.get("c");

  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(deepLinkId);
  const [search, setSearch] = useState("");

  const online = useOnlineUsers();

  // A deep link (?c=...) can point at a conversation not yet in the initial
  // list (just created from a profile's "Написати" button) — refetch once.
  useEffect(() => {
    if (!deepLinkId || conversations.some((c) => c.id === deepLinkId)) return;
    const supabase = createClient();
    getConversations(supabase, userId).then(setConversations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkId]);

  // Catch-all live refresh: any message insert I'm allowed to see (RLS-scoped
  // to my conversations) reorders the list / picks up brand-new threads.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("messages:mine")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        getConversations(supabase, userId).then(setConversations);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  function handleMessageSent(conversationId: string, preview: string, at: string) {
    setConversations((prev) => {
      const next = prev.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: { content: preview, created_at: at, sender_id: userId }, unreadCount: 0 }
          : c
      );
      return [...next].sort((a, b) => (b.lastMessage?.created_at ?? "").localeCompare(a.lastMessage?.created_at ?? ""));
    });
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((c) => c.otherParticipant?.full_name.toLowerCase().includes(query));
  }, [conversations, search]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="glass flex h-full min-h-0 overflow-hidden rounded-2xl border border-border-subtle">
      <aside
        className={`w-full shrink-0 flex-col md:flex md:w-[340px] ${
          selectedId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="shrink-0 p-4">
          <h1 className="font-display text-xl font-semibold text-ink-primary">Повідомлення</h1>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2">
            <Search size={15} className="shrink-0 text-ink-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук у чатах..."
              className="w-full min-w-0 bg-transparent text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-ink-tertiary">
              {conversations.length === 0
                ? "У вас ще немає повідомлень."
                : "Нічого не знайдено за цим запитом."}
            </p>
          ) : (
            filtered.map((c) => (
              <ChatListItem
                key={c.id}
                conversation={c}
                active={c.id === selectedId}
                online={c.otherParticipant ? online.has(c.otherParticipant.id) : false}
                typing={false}
                onSelect={() => handleSelect(c.id)}
              />
            ))
          )}
        </div>
      </aside>

      <div className={`min-w-0 flex-1 flex-col md:flex ${selectedId ? "flex" : "hidden md:flex"}`}>
        {selected ? (
          <ChatThread
            userId={userId}
            conversation={selected}
            online={selected.otherParticipant ? online.has(selected.otherParticipant.id) : false}
            onBack={() => setSelectedId(null)}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-ink-tertiary">
            <MessageCircle size={28} className="opacity-50" />
            <p className="text-[13px]">Оберіть розмову, щоб почати спілкування</p>
          </div>
        )}
      </div>
    </div>
  );
}
