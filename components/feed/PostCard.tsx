import { Heart, MessageCircle } from "lucide-react";
import { initials } from "@/lib/profile";
import type { FeedItem } from "@/lib/feed";

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

export default function PostCard({ item }: { item: FeedItem }) {
  const name = item.author?.full_name ?? "Учасник Anexa";

  return (
    <article className="glass rounded-2xl border border-border-subtle p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grad-purple-blue text-[12px] font-semibold text-white">
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-ink-primary">
            {name}
          </p>
          <p className="truncate text-[12px] text-ink-tertiary">
            {[item.author?.role_title, timeAgo(item.created_at)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-secondary">
        {item.body}
      </p>

      <div className="mt-3 flex items-center gap-5 border-t border-border-subtle pt-3 text-[12.5px] text-ink-tertiary">
        <span className="flex items-center gap-1.5">
          <Heart size={14} />
          {item.like_count}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle size={14} />
          {item.comment_count}
        </span>
      </div>
    </article>
  );
}
