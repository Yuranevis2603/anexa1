"use client";

import { useEffect, useState } from "react";
import { Loader2, Pin, PinOff, Send, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addReply,
  deleteReply,
  deleteThread,
  getReplies,
  setThreadPinned,
  type DiscussionReply,
  type DiscussionThread,
} from "@/lib/discussions";
import { useToast } from "@/components/ui/ToastProvider";
import ModalPortal from "@/components/ui/ModalPortal";
import Avatar from "@/components/ui/Avatar";

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

export default function ThreadDetailModal({
  userId,
  thread,
  canModerate,
  onClose,
  onPinnedChange,
  onThreadDeleted,
}: {
  userId: string;
  thread: DiscussionThread;
  /** Community Admin/Moderator — combined with thread.userId === userId
   * (the RLS-matching "author OR staff" rule) to decide pin/delete access. */
  canModerate: boolean;
  onClose: () => void;
  onPinnedChange: (threadId: string, pinned: boolean) => void;
  onThreadDeleted: (threadId: string) => void;
}) {
  const { showToast } = useToast();
  const [replies, setReplies] = useState<DiscussionReply[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinned, setPinned] = useState(thread.pinned);
  const [pinPending, setPinPending] = useState(false);
  const [deletingThread, setDeletingThread] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const canManageThread = canModerate || thread.userId === userId;

  const [replyBody, setReplyBody] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const data = await getReplies(supabase, thread.id);
      if (!cancelled) {
        setReplies(data);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [thread.id]);

  async function handleTogglePin() {
    if (pinPending) return;
    const next = !pinned;
    setPinPending(true);
    setPinned(next);
    try {
      const supabase = createClient();
      await setThreadPinned(supabase, thread.id, next);
      onPinnedChange(thread.id, next);
    } catch (error) {
      setPinned(!next);
      showToast("error", "Не вдалося оновити закріплення.");
      console.error("setThreadPinned failed:", error);
    } finally {
      setPinPending(false);
    }
  }

  async function handleDeleteThread() {
    if (deletingThread) return;
    setDeletingThread(true);
    try {
      const supabase = createClient();
      await deleteThread(supabase, thread.id);
      onThreadDeleted(thread.id);
      onClose();
    } catch (error) {
      showToast("error", "Не вдалося видалити тему.");
      console.error("deleteThread failed:", error);
      setDeletingThread(false);
      setConfirmingDelete(false);
    }
  }

  async function handleDeleteReply(replyId: string) {
    try {
      const supabase = createClient();
      await deleteReply(supabase, replyId);
      setReplies((prev) => (prev ? prev.filter((r) => r.id !== replyId) : prev));
    } catch (error) {
      showToast("error", "Не вдалося видалити відповідь.");
      console.error("deleteReply failed:", error);
    }
  }

  async function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = replyBody.trim();
    if (!trimmed || posting) return;

    setPosting(true);
    try {
      const supabase = createClient();
      await addReply(supabase, thread.id, userId, trimmed);
      setReplyBody("");
      const data = await getReplies(supabase, thread.id);
      setReplies(data);
    } catch (error) {
      showToast("error", "Не вдалося надіслати відповідь.");
      console.error("addReply failed:", error);
    } finally {
      setPosting(false);
    }
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4"
        onClick={onClose}
        role="presentation"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-border-subtle bg-base-card sm:rounded-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border-subtle p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {thread.topic ? (
                  <span className="rounded-md border border-border-subtle bg-white/[0.04] px-2 py-0.5 text-[10.5px] text-ink-secondary">
                    {thread.topic}
                  </span>
                ) : null}
                {pinned ? (
                  <span className="rounded-md border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gold">
                    ЗАКРІПЛЕНО
                  </span>
                ) : null}
              </div>
              <h2 className="mt-1.5 font-display text-[16px] font-semibold text-ink-primary">{thread.title}</h2>
              <p className="mt-1 text-[12px] text-ink-tertiary">
                {thread.authorName} · {timeAgo(thread.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canManageThread ? (
                <button
                  type="button"
                  onClick={handleTogglePin}
                  disabled={pinPending}
                  aria-label={pinned ? "Відкріпити" : "Закріпити"}
                  className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary disabled:opacity-60"
                >
                  {pinned ? <PinOff size={15} /> : <Pin size={15} />}
                </button>
              ) : null}
              {canManageThread ? (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  aria-label="Видалити тему"
                  className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрити"
                className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {confirmingDelete ? (
            <div className="flex items-center justify-between gap-3 border-b border-danger/30 bg-danger/[0.06] px-5 py-3">
              <p className="text-[12.5px] text-ink-secondary">Видалити цю тему разом з усіма відповідями?</p>
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
                  onClick={handleDeleteThread}
                  disabled={deletingThread}
                  className="flex items-center gap-1.5 rounded-md bg-danger px-2.5 py-1 text-[12px] font-medium text-white disabled:opacity-60"
                >
                  {deletingThread ? <Loader2 size={12} className="animate-spin" /> : null}
                  Видалити
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto p-5">
            {thread.body ? (
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-secondary">{thread.body}</p>
            ) : null}

            <div className="mt-5 flex flex-col gap-3">
              {loading ? (
                <div className="flex items-center gap-2 text-[12.5px] text-ink-tertiary">
                  <Loader2 size={13} className="animate-spin" />
                  Завантаження відповідей...
                </div>
              ) : replies && replies.length > 0 ? (
                replies.map((reply) => (
                  <div key={reply.id} className="flex items-start gap-2.5">
                    <Avatar
                      src={reply.authorAvatarUrl}
                      name={reply.authorName}
                      size={28}
                      className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[10.5px] font-semibold text-white"
                    />
                    <div className="min-w-0 flex-1 rounded-xl bg-base-surface px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[12.5px] font-medium text-ink-primary">{reply.authorName}</span>
                          <p className="shrink-0 text-[11px] text-ink-tertiary">{timeAgo(reply.createdAt)}</p>
                        </div>
                        {reply.userId === userId || canModerate ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteReply(reply.id)}
                            aria-label="Видалити відповідь"
                            className="shrink-0 text-ink-tertiary transition-colors hover:text-danger"
                          >
                            <Trash2 size={12} />
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-secondary">
                        {reply.body}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[12.5px] text-ink-tertiary">Ще немає відповідей. Будьте першим.</p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmitReply} className="flex items-center gap-2 border-t border-border-subtle p-4">
            <input
              type="text"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Написати відповідь..."
              className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
            />
            <button
              type="submit"
              disabled={posting || !replyBody.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-grad-purple-blue px-3.5 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity disabled:opacity-60"
            >
              {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
