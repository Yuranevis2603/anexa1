"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { adminDeletePost, type AdminPost } from "@/lib/admin";
import { postTypeMeta } from "@/lib/feed";
import { useToast } from "@/components/ui/ToastProvider";
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

export default function AdminPostsTable({ initialPosts }: { initialPosts: AdminPost[] }) {
  const { showToast } = useToast();
  const [posts, setPosts] = useState(initialPosts);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return posts;
    return posts.filter((p) => p.body.toLowerCase().includes(term) || p.authorName.toLowerCase().includes(term));
  }, [posts, search]);

  async function handleDelete(post: AdminPost) {
    if (deletingId) return;
    setDeletingId(post.id);
    try {
      await adminDeletePost(createClient(), post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      showToast("success", "Пост видалено.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося видалити пост.");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink-primary">Пости</h1>
      <p className="mt-1 text-[13px] text-ink-tertiary">{posts.length} останніх постів платформи</p>

      <div className="glass mt-5 rounded-2xl border border-border-subtle p-3">
        <div className="flex max-w-sm items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[12.5px]">
          <Search size={14} className="shrink-0 text-ink-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за текстом або автором..."
            className="w-full bg-transparent text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
          />
        </div>

        <div className="mt-3 flex flex-col divide-y divide-border-subtle">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-ink-tertiary">Нічого не знайдено.</p>
          ) : (
            filtered.map((post) => {
              const meta = postTypeMeta(post.postType);
              return (
                <div key={post.id} className="flex items-start gap-3 py-3">
                  <Avatar
                    src={post.authorAvatarUrl}
                    name={post.authorName}
                    size={32}
                    className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[11px] font-semibold text-white"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[12.5px] font-medium text-ink-primary">{post.authorName}</p>
                      {meta ? <span className="text-[11px] text-ink-tertiary">{meta.emoji} {meta.label}</span> : null}
                      <span className="text-[11px] text-ink-tertiary">· {timeAgo(post.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-secondary">{post.body}</p>
                    <p className="mt-1 text-[11px] text-ink-tertiary">
                      {post.likeCount} лайків · {post.commentCount} коментарів
                    </p>
                  </div>
                  <div className="shrink-0">
                    {confirmId === post.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDelete(post)}
                          disabled={deletingId === post.id}
                          className="flex items-center gap-1 rounded-lg bg-danger px-2.5 py-1.5 text-[11.5px] font-medium text-white transition-opacity disabled:opacity-60"
                        >
                          {deletingId === post.id ? <Loader2 size={12} className="animate-spin" /> : null}
                          Підтвердити
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="rounded-lg border border-border-subtle px-2.5 py-1.5 text-[11.5px] text-ink-secondary hover:bg-white/[0.05]"
                        >
                          Скасувати
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(post.id)}
                        aria-label="Видалити пост"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
