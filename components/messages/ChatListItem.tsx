"use client";

import Image from "next/image";
import { initials } from "@/lib/profile";
import { attachmentPreviewLabel, formatChatListTime, type ConversationSummary } from "@/lib/messages";

export default function ChatListItem({
  conversation,
  active,
  online,
  typing,
  onSelect,
}: {
  conversation: ConversationSummary;
  active: boolean;
  online: boolean;
  typing: boolean;
  onSelect: () => void;
}) {
  const other = conversation.otherParticipant;
  const name = other?.full_name ?? "Учасник ANEXA";
  const last = conversation.lastMessage;
  const preview = !last
    ? "Немає повідомлень"
    : last.content.trim()
      ? last.content
      : attachmentPreviewLabel(last.attachment_name, last.attachment_type);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
        active ? "bg-white/[0.07] shadow-[inset_2px_0_0_0_#7C5CFF]" : "hover:bg-white/[0.04]"
      }`}
    >
      <div className="relative shrink-0">
        <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[13px] font-semibold text-white shadow-glow-purple">
          {other?.avatar_url ? (
            <Image src={other.avatar_url} alt={name} fill sizes="44px" className="object-cover" />
          ) : (
            initials(name)
          )}
        </div>
        {online ? (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-base bg-success" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13.5px] font-medium text-ink-primary">{name}</p>
          {conversation.lastMessage ? (
            <span className="shrink-0 text-[11px] text-ink-tertiary">
              {formatChatListTime(conversation.lastMessage.created_at)}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={`truncate text-[12.5px] ${
              typing ? "font-medium text-purple-soft" : "text-ink-tertiary"
            }`}
          >
            {typing ? "друкує..." : preview}
          </p>
          {conversation.unreadCount > 0 ? (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-grad-purple-blue px-1.5 text-[11px] font-medium text-white shadow-glow-purple">
              {conversation.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
