"use client";

import { useState } from "react";
import { Heart, Loader2, MessageCircle, Send } from "lucide-react";
import { initials } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import {
  createComment,
  getComments,
  toggleLike,
  type FeedComment,
  type FeedItem,
} from "@/lib/feed";

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

export default function PostCard({
  item,
  userId,
  initiallyLiked,
}: {
  item: FeedItem;
  userId: string;
  initiallyLiked: boolean;
}) {
  const name = item.author?.full_name ?? "Учасник Anexa";

  const [liked, setLiked] = useState(initiallyLiked);
  const [likeCount, setLikeCount] = useState(item.like_count);
  const [likePending, setLikePending] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<FeedComment[] | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(item.comment_count);

  const [commentBody, setCommentBody] = useState("");
  const [commentPosting, setCommentPosting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  async function handleToggleLike() {
    if (likePending) return;

    const wasLiked = liked;
    setLikePending(true);
    setLiked(!wasLiked);
    setLikeCount((count) => count + (wasLiked ? -1 : 1));

    try {
      const supabase = createClient();
      await toggleLike(supabase, item.id, userId);
    } catch (error) {
      setLiked(wasLiked);
      setLikeCount((count) => count + (wasLiked ? 1 : -1));
      console.error("toggleLike failed:", error);
    } finally {
      setLikePending(false);
    }
  }

  async function loadComments() {
    setCommentsLoading(true);
    const supabase = createClient();
    const data = await getComments(supabase, item.id);
    setComments(data);
    setCommentsLoading(false);
  }

  async function handleToggleComments() {
    const opening = !commentsOpen;
    setCommentsOpen(opening);
    if (opening && comments === null) {
      await loadComments();
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = commentBody.trim();
    if (!trimmed) {
      setCommentError("Напишіть щось перед публікацією.");
      return;
    }

    setCommentPosting(true);
    setCommentError(null);

    try {
      const supabase = createClient();
      await createComment(supabase, item.id, userId, trimmed);
      setCommentBody("");
      setCommentCount((count) => count + 1);
      await loadComments();
    } catch (error) {
      setCommentError(
        error instanceof Error ? error.message : "Не вдалося додати коментар."
      );
    } finally {
      setCommentPosting(false);
    }
  }

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
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={likePending}
          className={`flex items-center gap-1.5 transition-colors disabled:opacity-60 ${
            liked ? "text-danger" : "hover:text-ink-secondary"
          }`}
        >
          <Heart size={14} className={liked ? "fill-danger" : undefined} />
          {likeCount}
        </button>
        <button
          type="button"
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 transition-colors hover:text-ink-secondary"
        >
          <MessageCircle size={14} />
          {commentCount}
        </button>
      </div>

      {commentsOpen ? (
        <div className="mt-3 flex flex-col gap-3 border-t border-border-subtle pt-3">
          {commentsLoading ? (
            <div className="flex items-center gap-2 text-[12.5px] text-ink-tertiary">
              <Loader2 size={13} className="animate-spin" />
              Завантаження коментарів...
            </div>
          ) : comments && comments.length > 0 ? (
            comments.map((comment) => {
              const commentName = comment.author?.full_name ?? "Учасник Anexa";
              return (
                <div key={comment.id} className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-grad-purple-blue text-[10.5px] font-semibold text-white">
                    {initials(commentName)}
                  </div>
                  <div className="min-w-0 flex-1 rounded-xl bg-base-surface px-3 py-2">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[12.5px] font-medium text-ink-primary">
                        {commentName}
                      </p>
                      <p className="shrink-0 text-[11px] text-ink-tertiary">
                        {timeAgo(comment.created_at)}
                      </p>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-secondary">
                      {comment.body}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-[12.5px] text-ink-tertiary">
              Ще немає коментарів. Будьте першим.
            </p>
          )}

          <form
            onSubmit={handleSubmitComment}
            className="glass rounded-xl border border-border-subtle p-3"
          >
            <textarea
              value={commentBody}
              onChange={(e) => {
                setCommentBody(e.target.value);
                if (commentError) setCommentError(null);
              }}
              placeholder="Напишіть коментар..."
              rows={2}
              className="w-full resize-none rounded-lg border border-border-subtle bg-base-surface px-3 py-2 text-[12.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/40 focus:outline-none"
            />

            {commentError ? (
              <p className="mt-2 text-[12px] text-danger">{commentError}</p>
            ) : null}

            <div className="mt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={commentPosting}
                className="flex items-center gap-2 rounded-lg bg-grad-purple-blue px-3.5 py-1.5 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity disabled:opacity-60"
              >
                {commentPosting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                Надіслати
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </article>
  );
}
