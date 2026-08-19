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
          ? {
              ...c,
              lastMessage: {
                content: preview,
                created_at: at,
                sender_id: userId,
                attachment_name: null,
                attachment_type: null,
              },
              unreadCount: 0,
            }
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
    <div className="glass flex h-full min-h-0 overflow-hidden rounded-2xl border border-border-subtle shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)]">
      <aside
        className={`w-full shrink-0 flex-col border-border-subtle md:flex md:w-[340px] md:border-r ${
          selectedId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="shrink-0 p-4">
          <h1 className="font-display text-xl font-semibold text-ink-primary">Повідомлення</h1>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 transition-colors focus-within:border-purple/40">
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
            <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-ink-tertiary">
                <MessageCircle size={18} />
              </div>
              <p className="text-[12.5px] text-ink-tertiary">
                {conversations.length === 0
                  ? "У вас ще немає повідомлень."
                  : "Нічого не знайдено за цим запитом."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filtered.map((c) => (
                <ChatListItem
                  key={c.id}
                  conversation={c}
                  active={c.id === selectedId}
                  online={c.otherParticipant ? online.has(c.otherParticipant.id) : false}
                  typing={false}
                  onSelect={() => handleSelect(c.id)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      <div className={`min-w-0 flex-1 flex-col bg-white/[0.015] md:flex ${selectedId ? "flex" : "hidden md:flex"}`}>
        {selected ? (
          <ChatThread
            userId={userId}
            conversation={selected}
            online={selected.otherParticipant ? online.has(selected.otherParticipant.id) : false}
            onBack={() => setSelectedId(null)}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-grad-purple-blue opacity-90 shadow-glow-purple">
              <MessageCircle size={22} className="text-white" />
            </div>
            <p className="text-[13px] text-ink-tertiary">Оберіть розмову, щоб почати спілкування</p>
          </div>
        )}
      </div>
    </div>
  );
}
