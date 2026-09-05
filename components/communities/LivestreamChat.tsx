"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getLivestreamMessages,
  sendLivestreamMessage,
  type LivestreamChatMessage,
} from "@/lib/livestreams";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";

export type MemberDirectory = Map<string, { name: string; avatarUrl: string | null }>;

export default function LivestreamChat({
  livestreamId,
  userId,
  memberDirectory,
}: {
  livestreamId: string;
  userId: string;
  memberDirectory: MemberDirectory;
}) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<LivestreamChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    getLivestreamMessages(supabase, livestreamId).then((rows) => {
      if (!cancelled) setMessages(rows);
    });

    const channel = supabase
      .channel(`livestream-chat:${livestreamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_livestream_messages",
          filter: `livestream_id=eq.${livestreamId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; sender_id: string; body: string; created_at: string };
          const sender = memberDirectory.get(row.sender_id);
          setMessages((prev) =>
            prev.some((m) => m.id === row.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: row.id,
                    livestreamId,
                    senderId: row.sender_id,
                    senderName: sender?.name ?? "Учасник ANEXA",
                    senderAvatarUrl: sender?.avatarUrl ?? null,
                    body: row.body,
                    createdAt: row.created_at,
                  },
                ]
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [livestreamId, memberDirectory]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    try {
      const supabase = createClient();
      const inserted = await sendLivestreamMessage(supabase, livestreamId, userId, text);
      const own = memberDirectory.get(userId);
      setMessages((prev) =>
        prev.some((m) => m.id === inserted.id)
          ? prev
          : [
              ...prev,
              {
                id: inserted.id,
                livestreamId,
                senderId: userId,
                senderName: own?.name ?? "Ви",
                senderAvatarUrl: own?.avatarUrl ?? null,
                body: text,
                createdAt: inserted.createdAt,
              },
            ]
      );
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося надіслати повідомлення.");
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="glass flex h-[420px] flex-col overflow-hidden rounded-2xl border border-border-subtle lg:h-[520px]">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Чат ефіру</p>
        <span className="text-[11.5px] text-ink-tertiary">{messages.length}</span>
      </div>

      <div ref={listRef} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-3.5">
        {messages.length === 0 ? (
          <p className="text-[12.5px] text-ink-tertiary">Ще немає повідомлень — напишіть перше.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex gap-2.5">
              <Avatar
                src={m.senderAvatarUrl}
                name={m.senderName}
                size={28}
                className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[10px] font-semibold text-white"
              />
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-ink-secondary">{m.senderName}</p>
                <p className="mt-0.5 break-words text-[13px] leading-snug text-ink-primary">{m.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-border-subtle p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-2.5 py-1.5">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Написати в чат..."
            maxLength={500}
            className="flex-1 bg-transparent py-1 text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-grad-purple-blue text-white transition-opacity disabled:opacity-60"
            aria-label="Надіслати"
          >
            <Send size={13} />
          </button>
        </div>
      </form>
    </div>
  );
}
