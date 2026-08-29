"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Check, Download, File as FileIcon, Loader2, Paperclip, Phone, Send, Video, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/ToastProvider";
import {
  attachmentPreviewLabel,
  formatDaySeparator,
  formatFileSize,
  formatMessageTime,
  getMessages,
  getParticipantLastRead,
  getSignedAttachmentUrls,
  markConversationRead,
  sendMessage,
  uploadMessageAttachment,
  type ChatMessage,
  type ConversationSummary,
  type MessageAttachment,
} from "@/lib/messages";
import { useTypingPresence } from "@/lib/presence";
import ProfilePreviewCard from "@/components/profile/ProfilePreviewCard";
import Avatar from "@/components/ui/Avatar";
import { useCall } from "@/components/calls/CallProvider";

const MAX_ATTACHMENT_MB = 15;

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
  const { call, startCall } = useCall();
  const other = conversation.otherParticipant;
  const name = other?.full_name ?? "Учасник ANEXA";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { otherIsTyping, notifyTyping } = useTypingPresence(conversation.id, userId);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function signAttachments(supabase: ReturnType<typeof createClient>, msgs: ChatMessage[]) {
    const paths = msgs.map((m) => m.attachment_path).filter((p): p is string => Boolean(p));
    if (paths.length === 0) return;
    const urls = await getSignedAttachmentUrls(supabase, paths);
    setSignedUrls((prev) => new Map([...prev, ...urls]));
  }

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
      signAttachments(supabase, history);
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
          if (incoming.attachment_path) signAttachments(supabase, [incoming]);
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

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      showToast("error", `Файл завеликий (максимум ${MAX_ATTACHMENT_MB} МБ).`);
      return;
    }
    setPendingFile(file);
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = body.trim();
    if ((!trimmed && !pendingFile) || sending || uploading) return;

    const supabase = createClient();
    let attachment: MessageAttachment | null = null;

    if (pendingFile) {
      setUploading(true);
      try {
        attachment = await uploadMessageAttachment(supabase, conversation.id, pendingFile);
      } catch (error) {
        showToast("error", error instanceof Error ? error.message : "Не вдалося завантажити файл.");
        console.error("uploadMessageAttachment failed:", error);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    setSending(true);
    try {
      await sendMessage(supabase, conversation.id, userId, trimmed, attachment);
      const preview = trimmed || (attachment ? attachmentPreviewLabel(attachment.name, attachment.type) : "");
      setBody("");
      setPendingFile(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      onMessageSent(conversation.id, preview, new Date().toISOString());
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
          {other ? (
            <ProfilePreviewCard userId={other.id}>
              <Avatar
                src={other.avatar_url}
                name={name}
                size={36}
                className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[13px] font-semibold text-white"
              />
            </ProfilePreviewCard>
          ) : (
            <Avatar
              src={null}
              name={name}
              size={36}
              className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[13px] font-semibold text-white"
            />
          )}
          {online ? (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-base bg-success" />
          ) : null}
        </div>
        <div className="min-w-0">
          {other ? (
            <ProfilePreviewCard userId={other.id}>
              <span className="truncate text-[13.5px] font-medium text-ink-primary">{name}</span>
            </ProfilePreviewCard>
          ) : (
            <p className="truncate text-[13.5px] font-medium text-ink-primary">{name}</p>
          )}
          <p className={`truncate text-[12px] ${statusColor}`}>{statusText}</p>
        </div>
        {other ? (
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => startCall(conversation.id, "audio")}
              disabled={Boolean(call)}
              aria-label="Аудіодзвінок"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:bg-white/[0.05] hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Phone size={18} />
            </button>
            <button
              type="button"
              onClick={() => startCall(conversation.id, "video")}
              disabled={Boolean(call)}
              aria-label="Відеодзвінок"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:bg-white/[0.05] hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Video size={18} />
            </button>
          </div>
        ) : null}
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
                    {m.attachment_path ? (
                      m.attachment_type?.startsWith("image/") ? (
                        <a
                          href={signedUrls.get(m.attachment_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mb-1.5 block overflow-hidden rounded-2xl border border-border-subtle"
                        >
                          {signedUrls.get(m.attachment_path) ? (
                            <Image
                              src={signedUrls.get(m.attachment_path)!}
                              alt={m.attachment_name ?? ""}
                              width={800}
                              height={600}
                              sizes="(max-width: 640px) 90vw, 480px"
                              className="max-h-72 w-full object-cover"
                            />
                          ) : null}
                        </a>
                      ) : (
                        <a
                          href={signedUrls.get(m.attachment_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mb-1.5 flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 transition-opacity hover:opacity-90 ${
                            mine ? "border-white/15 bg-white/10 text-white" : "border-border-subtle bg-base-card text-ink-primary"
                          }`}
                        >
                          <FileIcon size={18} className="shrink-0 opacity-80" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-medium">{m.attachment_name}</p>
                            <p className="text-[11px] opacity-70">{formatFileSize(m.attachment_size ?? 0)}</p>
                          </div>
                          <Download size={15} className="shrink-0 opacity-70" />
                        </a>
                      )
                    ) : null}
                    {m.content.trim() ? (
                      <div
                        className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed shadow-sm ${
                          mine
                            ? "rounded-br-md bg-grad-purple-blue text-white shadow-glow-purple"
                            : "rounded-bl-md border border-border-subtle bg-base-card text-ink-primary"
                        }`}
                      >
                        {m.content}
                      </div>
                    ) : null}
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
        {pendingFile ? (
          <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-border-subtle bg-white/[0.03] px-3 py-2">
            <FileIcon size={16} className="shrink-0 text-ink-tertiary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-ink-primary">{pendingFile.name}</p>
              <p className="text-[11px] text-ink-tertiary">{formatFileSize(pendingFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              aria-label="Прибрати файл"
              className="shrink-0 text-ink-tertiary transition-colors hover:text-danger"
            >
              <X size={15} />
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-2 rounded-2xl border border-border-subtle bg-white/[0.03] p-1.5 pl-2 transition-colors focus-within:border-purple/40">
          <button
            type="button"
            onClick={handleAttachClick}
            disabled={uploading}
            aria-label="Прикріпити файл"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary disabled:opacity-50"
          >
            <Paperclip size={16} />
          </button>
          <input ref={fileInputRef} type="file" onChange={handleFileSelected} className="hidden" />
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
            disabled={(!body.trim() && !pendingFile) || sending || uploading}
            aria-label="Надіслати"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-grad-purple-blue text-white shadow-glow-purple transition-opacity disabled:opacity-50"
          >
            {sending || uploading ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </form>
    </div>
  );
}
