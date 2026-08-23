"use client";

import type { DiscussionThread } from "@/lib/discussions";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "щойно";
  if (minutes < 60) return `${minutes} хв тому`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  return `${days} дн тому`;
}

export default function DiscussionThreadCard({ thread, onOpen }: { thread: DiscussionThread; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="glass flex w-full items-start gap-4 rounded-2xl border border-border-subtle p-4 text-left transition-colors hover:border-purple/30"
    >
      <div className="flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-xl border border-border-subtle bg-white/[0.03] py-2">
        <span className="font-display text-[16px] font-semibold text-purple-soft">{thread.replyCount}</span>
        <span className="text-[10px] text-ink-tertiary">відповідей</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {thread.pinned ? (
            <span className="rounded-md border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gold">
              ЗАКРІПЛЕНО
            </span>
          ) : null}
          {thread.topic ? (
            <span className="rounded-md border border-border-subtle bg-white/[0.04] px-2 py-0.5 text-[10.5px] text-ink-secondary">
              {thread.topic}
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 text-[14.5px] font-semibold text-ink-primary">{thread.title}</p>
        {thread.body ? (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-tertiary">{thread.body}</p>
        ) : null}
        <p className="mt-2 text-[11.5px] text-ink-tertiary">
          {thread.authorName} · {timeAgo(thread.createdAt)}
        </p>
      </div>
    </button>
  );
}
