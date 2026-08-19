"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  Trash2,
} from "lucide-react";
import { initials } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/ToastProvider";
import { getOrCreateConversation } from "@/lib/messages";
import {
  createComment,
  ctaLabel,
  deleteComment,
  deletePost,
  getComments,
  postTypeMeta,
  toggleLike,
  toggleSave,
  workFormatLabel,
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
  initiallySaved,
  onDeleted,
  onUnsaved,
}: {
  item: FeedItem;
  userId: string;
  initiallyLiked: boolean;
  initiallySaved: boolean;
  onDeleted: (id: string) => void;
  onUnsaved?: (id: string) => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const name = item.author?.full_name ?? "Учасник ANEXA";
  const isOwn = item.user_id === userId;
  const typeMeta = postTypeMeta(item.post_type);
  const cta = ctaLabel(item.cta_type);
  const workFormat = workFormatLabel(item.work_format);
  const profileHref = isOwn ? "/dashboard/profile" : `/dashboard/people/${item.user_id}`;

  const [liked, setLiked] = useState(initiallyLiked);
  const [likeCount, setLikeCount] = useState(item.like_count);
  const [likePending, setLikePending] = useState(false);

  const [saved, setSaved] = useState(initiallySaved);
  const [savePending, setSavePending] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<FeedComment[] | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(item.comment_count);

  const [commentBody, setCommentBody] = useState("");
  const [commentPosting, setCommentPosting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ctaPending, setCtaPending] = useState(false);

  async function handleCta() {
    if (ctaPending) return;

    // "Написати" opens a real conversation; every other CTA is a softer
    // "learn more about them" ask, so it lands on the profile instead.
    if (item.cta_type !== "contact" || isOwn) {
      router.push(profileHref);
      return;
    }

    setCtaPending(true);
    try {
      const supabase = createClient();
      const conversationId = await getOrCreateConversation(supabase, userId, item.user_id);
      router.push(`/dashboard/messages?c=${conversationId}`);
    } catch (error) {
      showToast("error", "Не вдалося відкрити чат.");
      console.error("getOrCreateConversation failed:", error);
      setCtaPending(false);
    }
  }

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
      showToast("error", "Не вдалося оновити лайк.");
      console.error("toggleLike failed:", error);
    } finally {
      setLikePending(false);
    }
  }

  async function handleToggleSave() {
    if (savePending) return;

    const wasSaved = saved;
    setSavePending(true);
    setSaved(!wasSaved);

    try {
      const supabase = createClient();
      await toggleSave(supabase, item.id, userId);
      if (!wasSaved) {
        showToast("success", "Збережено. Переглянути можна у вкладці «🔖 Збережені».");
      } else {
        onUnsaved?.(item.id);
      }
    } catch (error) {
      setSaved(wasSaved);
      showToast("error", "Не вдалося зберегти пост.");
      console.error("toggleSave failed:", error);
    } finally {
      setSavePending(false);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/dashboard?post=${item.id}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text: item.body.slice(0, 120), url });
        return;
      }
    } catch {
      return; // user cancelled the native share sheet
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast("success", "Посилання скопійовано.");
    } catch {
      showToast("error", "Не вдалося скопіювати посилання.");
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

  async function handleDeleteComment(commentId: string) {
    try {
      const supabase = createClient();
      await deleteComment(supabase, commentId);
      setComments((prev) => (prev ? prev.filter((c) => c.id !== commentId) : prev));
      setCommentCount((count) => Math.max(count - 1, 0));
    } catch (error) {
      showToast("error", "Не вдалося видалити коментар.");
      console.error("deleteComment failed:", error);
    }
  }

  async function handleDeletePost() {
    if (deleting) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      await deletePost(supabase, item.id);
      showToast("success", "Пост видалено.");
      onDeleted(item.id);
    } catch (error) {
      showToast("error", "Не вдалося видалити пост.");
      console.error("deletePost failed:", error);
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <article className="glass rounded-2xl border border-border-subtle p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link href={profileHref} className="shrink-0">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[12px] font-semibold text-white">
              {item.author?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.author.avatar_url} alt={name} className="h-full w-full object-cover" />
              ) : (
                initials(name)
              )}
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5">
              <Link href={profileHref} className="truncate text-[13.5px] font-medium text-ink-primary hover:underline">
                {name}
              </Link>
              {item.author?.membership_tier === "black" ? (
                <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-secondary">
                  Black
                </span>
              ) : null}
            </div>
            <p className="truncate text-[12px] text-ink-tertiary">
              {[item.author?.username ? `@${item.author.username}` : null, item.author?.role_title, timeAgo(item.created_at)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {typeMeta ? (
            <span className="flex items-center gap-1 whitespace-nowrap rounded-full border border-border-subtle bg-white/[0.03] px-2.5 py-1 text-[11.5px] font-medium text-ink-secondary">
              <span>{typeMeta.emoji}</span>
              {typeMeta.label}
            </span>
          ) : null}

          {isOwn ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Дії з постом"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-8 z-10 w-40 overflow-hidden rounded-lg border border-border-subtle bg-base-card shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmingDelete(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-danger transition-colors hover:bg-white/[0.05]"
                  >
                    <Trash2 size={13} />
                    Видалити пост
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {confirmingDelete ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/[0.06] px-3 py-2">
          <p className="text-[12.5px] text-ink-secondary">Видалити цей пост назавжди?</p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-md px-2.5 py-1 text-[12px] font-medium text-ink-secondary hover:bg-white/[0.06]"
            >
              Скасувати
            </button>
            <button
              type="button"
              onClick={handleDeletePost}
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-md bg-danger px-2.5 py-1 text-[12px] font-medium text-white disabled:opacity-60"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : null}
              Видалити
            </button>
          </div>
        </div>
      ) : null}

      <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-secondary">
        {item.body}
      </p>

      {item.image_url ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-border-subtle">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url} alt="" loading="lazy" className="max-h-96 w-full object-cover" />
        </div>
      ) : null}

      {item.category || item.budget || workFormat ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.category ? (
            <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11.5px] text-ink-secondary">
              {item.category}
            </span>
          ) : null}
          {item.budget ? (
            <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11.5px] text-ink-secondary">
              💰 {item.budget}
            </span>
          ) : null}
          {workFormat ? (
            <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11.5px] text-ink-secondary">
              {workFormat}
            </span>
          ) : null}
        </div>
      ) : null}

      {cta ? (
        <button
          type="button"
          onClick={handleCta}
          disabled={ctaPending}
          className="mt-3 flex items-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {ctaPending ? <Loader2 size={13} className="animate-spin" /> : null}
          {cta}
        </button>
      ) : null}

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
        <button
          type="button"
          onClick={handleToggleSave}
          disabled={savePending}
          className={`flex items-center gap-1.5 transition-colors disabled:opacity-60 ${
            saved ? "text-gold" : "hover:text-ink-secondary"
          }`}
        >
          <Bookmark size={14} className={saved ? "fill-gold" : undefined} />
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="ml-auto flex items-center gap-1.5 transition-colors hover:text-ink-secondary"
        >
          <Share2 size={14} />
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
              const commentName = comment.author?.full_name ?? "Учасник ANEXA";
              const commentProfileHref =
                comment.user_id === userId ? "/dashboard/profile" : `/dashboard/people/${comment.user_id}`;
              return (
                <div key={comment.id} className="flex items-start gap-2.5">
                  <Link href={commentProfileHref} className="shrink-0">
                    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[10.5px] font-semibold text-white">
                      {comment.author?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={comment.author.avatar_url} alt={commentName} className="h-full w-full object-cover" />
                      ) : (
                        initials(commentName)
                      )}
                    </div>
                  </Link>
                  <div className="min-w-0 flex-1 rounded-xl bg-base-surface px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Link
                          href={commentProfileHref}
                          className="truncate text-[12.5px] font-medium text-ink-primary hover:underline"
                        >
                          {commentName}
                        </Link>
                        <p className="shrink-0 text-[11px] text-ink-tertiary">{timeAgo(comment.created_at)}</p>
                      </div>
                      {comment.user_id === userId ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          aria-label="Видалити коментар"
                          className="shrink-0 text-ink-tertiary transition-colors hover:text-danger"
                        >
                          <Trash2 size={12} />
                        </button>
                      ) : null}
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
