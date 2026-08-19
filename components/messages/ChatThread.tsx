"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, Paperclip, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/ToastProvider";
import { initials } from "@/lib/profile";
import {
  formatDaySeparator,
  formatMessageTime,
  getMessages,
  getParticipantLastRead,
  markConversationRead,
  sendMessage,
  type ChatMessage,
  type ConversationSummary,
} from "@/lib/messages";
import { useTypingPresence } from "@/lib/presence";

function groupByDay(messages: ChatMessage[]): { day: string; items: ChatMessage[] }[] {
  const groups: { day: string; items: ChatMessage[] }[] = [];
  for (const message of messages) {
    const day = new Date(message.created_at).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.items.push(message);
    } else {
      groups.push({ day, items: [message] });
    }
  }
  return groups;
}

export default function ChatThread({
  userId,
  conversation,
  online,
  onBack,
  onMessageSent,
}: {
  userId: string;
  conversation: ConversationSummary;
  online: boolean;
  onBack?: () => void;
  onMessageSent: (conversationId: string, preview: string, at: string) => void;
}) {
  const { showToast } = useToast();
  const other = conversation.otherParticipant;
  const name = other?.full_name ?? "Учасник ANEXA";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const { otherIsTyping, notifyTyping } = useTypingPresence(conversation.id, userId);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const supabase = createClient();

    async function load() {
      const [history, lastRead] = await Promise.all([
        getMessages(supabase, conversation.id),
        other ? getParticipantLastRead(supabase, conversation.id, other.id) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setMessages(history);
      setOtherLastReadAt(lastRead);
      setLoading(false);
      await markConversationRead(supabase, conversation.id, userId);
    }

    load();

    const channel = supabase
      .channel(`conversation:${conversation.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversation.id}` },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          if (incoming.sender_id !== userId) {
            markConversationRead(supabase, conversation.id, userId);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_participants",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string; last_read_at: string };
          if (other && row.user_id === other.id) {
            setOtherLastReadAt(row.last_read_at);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setBody(e.target.value);
    notifyTyping();
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    setSending(true);
    const supabase = createClient();

    try {
      await sendMessage(supabase, conversation.id, userId, trimmed);
      setBody("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      onMessageSent(conversation.id, trimmed, new Date().toISOString());
    } catch (error) {
      showToast("error", "Не вдалося надіслати повідомлення.");
      console.error("sendMessage failed:", error);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const statusText = otherIsTyping ? "друкує..." : online ? "в мережі" : "не в мережі";
  const statusColor = otherIsTyping ? "text-purple-soft" : online ? "text-success" : "text-ink-tertiary";
  const groups = groupByDay(messages);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="glass flex h-16 shrink-0 items-center gap-3 border-b border-border-subtle px-4 sm:px-5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Назад до списку"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-tertiary hover:bg-white/[0.05] hover:text-ink-primary md:hidden"
          >
            <ArrowLeft size={18} />
          </button>
        ) : null}
        <div className="relative shrink-0">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[13px] font-semibold text-white">
            {other?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={other.avatar_url} alt={name} className="h-full w-full object-cover" />
            ) : (
              initials(name)
            )}
          </div>
          {online ? (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-base bg-success" />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-ink-primary">{name}</p>
          <p className={`truncate text-[12px] ${statusColor}`}>{statusText}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-5 sm:px-6">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-ink-tertiary">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center text-[13px] text-ink-tertiary">
            Напишіть перше повідомлення, щоб почати розмову.
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.day} className="flex flex-col gap-3.5">
              <div className="flex items-center gap-3 px-2">
                <div className="h-px flex-1 bg-border-subtle" />
                <p className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
                  {formatDaySeparator(group.items[0].created_at)}
                </p>
                <div className="h-px flex-1 bg-border-subtle" />
              </div>
              {group.items.map((m) => {
                const mine = m.sender_id === userId;
                const read = mine && otherLastReadAt !== null && m.created_at <= otherLastReadAt;
                return (
                  <div
                    key={m.id}
                    className="flex max-w-[75%] flex-col sm:max-w-[64%]"
                    style={{ alignSelf: mine ? "flex-end" : "flex-start" }}
                  >
                    <div
                      className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed shadow-sm ${
                        mine
                          ? "rounded-br-md bg-grad-purple-blue text-white shadow-glow-purple"
                          : "rounded-bl-md border border-border-subtle bg-base-card text-ink-primary"
                      }`}
                    >
                      {m.content}
                    </div>
                    <div
                      className="mt-1 flex items-center gap-1.5"
                      style={{ justifyContent: mine ? "flex-end" : "flex-start" }}
                    >
                      <span className="text-[11px] text-ink-tertiary">{formatMessageTime(m.created_at)}</span>
                      {mine ? (
                        <Check size={13} className={read ? "text-purple-soft" : "text-ink-tertiary"} />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="glass shrink-0 border-t border-border-subtle px-4 py-3.5 sm:px-5">
        <div className="flex items-end gap-2 rounded-2xl border border-border-subtle bg-white/[0.03] p-1.5 pl-2 transition-colors focus-within:border-purple/40">
          <button
            type="button"
            onClick={() => showToast("success", "Завантаження файлів у чат з'явиться найближчим часом.")}
            aria-label="Прикріпити файл"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
          >
            <Paperclip size={16} />
          </button>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleBodyChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Написати повідомлення..."
            className="max-h-[120px] flex-1 resize-none bg-transparent py-1.5 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
          />
          <button
            type="submit"
            disabled={!body.trim() || sending}
            aria-label="Надіслати"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-grad-purple-blue text-white shadow-glow-purple transition-opacity disabled:opacity-50"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </form>
    </div>
  );
}
