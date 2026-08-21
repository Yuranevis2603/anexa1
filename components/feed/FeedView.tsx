"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { initials, type Profile } from "@/lib/profile";
import type { MatchCandidate } from "@/lib/match";
import { getBlockedUserIds } from "@/lib/moderation";
import {
  FEED_FILTERS,
  FEED_PAGE_SIZE,
  getFeedPage,
  getForYouPool,
  getSavedFeedPage,
  getUserLikes,
  getUserSaves,
  personalizeFeed,
  type FeedFilter,
  type FeedItem,
} from "@/lib/feed";
import PostCard from "./PostCard";
import PotentialMatch from "./PotentialMatch";
import CreatePostModal from "./CreatePostModal";

function PostCardSkeleton() {
  return (
    <div className="glass animate-pulse rounded-2xl border border-border-subtle p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-white/[0.06]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-white/[0.06]" />
          <div className="h-2.5 w-1/4 rounded bg-white/[0.04]" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-2.5 w-full rounded bg-white/[0.05]" />
        <div className="h-2.5 w-5/6 rounded bg-white/[0.05]" />
        <div className="h-2.5 w-2/3 rounded bg-white/[0.05]" />
      </div>
    </div>
  );
}

export default function FeedView({
  userId,
  profile,
  topMatch,
  initialFilter = "for_you",
}: {
  userId: string;
  profile: Profile | null;
  topMatch: MatchCandidate | null;
  initialFilter?: FeedFilter;
}) {
  const [filter, setFilter] = useState<FeedFilter>(initialFilter);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);

  // "Для тебе" ranks a bounded pool client-side; cached per tab-open so
  // "load more" never re-fetches or re-ranks it.
  const forYouPoolRef = useRef<FeedItem[]>([]);
  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const blockedIdsRef = useRef<Set<string>>(new Set());

  const loadFirstPage = useCallback(
    async (targetFilter: FeedFilter) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        blockedIdsRef.current = await getBlockedUserIds(supabase, userId);
        let pageItems: FeedItem[];
        let more: boolean;

        if (targetFilter === "for_you") {
          const pool = personalizeFeed(await getForYouPool(supabase), profile).filter(
            (i) => !blockedIdsRef.current.has(i.user_id)
          );
          forYouPoolRef.current = pool;
          pageItems = pool.slice(0, FEED_PAGE_SIZE);
          more = pool.length > FEED_PAGE_SIZE;
        } else if (targetFilter === "saved") {
          const result = await getSavedFeedPage(supabase, { userId, page: 0 });
          pageItems = result.items.filter((i) => !blockedIdsRef.current.has(i.user_id));
          more = result.hasMore;
        } else {
          const result = await getFeedPage(supabase, { filter: targetFilter, page: 0 });
          pageItems = result.items.filter((i) => !blockedIdsRef.current.has(i.user_id));
          more = result.hasMore;
        }

        const ids = pageItems.map((i) => i.id);
        // Every item on the "saved" tab is saved by definition — skip the
        // redundant lookup and just mark the whole page.
        const [liked, saved] = await Promise.all([
          getUserLikes(supabase, userId, ids),
          targetFilter === "saved" ? Promise.resolve(new Set(ids)) : getUserSaves(supabase, userId, ids),
        ]);

        if (requestId !== requestIdRef.current) return; // stale (filter changed again)

        setItems(pageItems);
        setLikedIds(liked);
        setSavedIds(saved);
        setHasMore(more);
        setPage(0);
      } catch (err) {
        if (requestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : "Не вдалося завантажити стрічку.");
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [profile, userId]
  );

  useEffect(() => {
    loadFirstPage(filter);
  }, [filter, loadFirstPage]);

  async function handleLoadMore() {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const supabase = createClient();
      const nextPage = page + 1;
      let nextItems: FeedItem[];
      let more: boolean;

      if (filter === "for_you") {
        const pool = forYouPoolRef.current;
        const start = nextPage * FEED_PAGE_SIZE;
        nextItems = pool.slice(start, start + FEED_PAGE_SIZE);
        more = start + FEED_PAGE_SIZE < pool.length;
      } else if (filter === "saved") {
        const result = await getSavedFeedPage(supabase, { userId, page: nextPage });
        nextItems = result.items.filter((i) => !blockedIdsRef.current.has(i.user_id));
        more = result.hasMore;
      } else {
        const result = await getFeedPage(supabase, { filter, page: nextPage });
        nextItems = result.items.filter((i) => !blockedIdsRef.current.has(i.user_id));
        more = result.hasMore;
      }

      const ids = nextItems.map((i) => i.id);
      const [liked, saved] = await Promise.all([
        getUserLikes(supabase, userId, ids),
        filter === "saved" ? Promise.resolve(new Set(ids)) : getUserSaves(supabase, userId, ids),
      ]);

      setItems((prev) => [...prev, ...nextItems]);
      setLikedIds((prev) => new Set([...prev, ...liked]));
      setSavedIds((prev) => new Set([...prev, ...saved]));
      setHasMore(more);
      setPage(nextPage);
    } catch {
      setError("Не вдалося завантажити більше постів.");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  // Infinite scroll: observe a sentinel below the list and auto-load the
  // next page instead of requiring the user to click a button every time.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, page, filter]);

  function handlePostDeleted(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    forYouPoolRef.current = forYouPoolRef.current.filter((i) => i.id !== id);
  }

  // Un-saving only needs to drop the card when we're looking at the
  // "saved" tab itself — everywhere else the post should stay put.
  function handlePostUnsaved(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handlePostCreated() {
    loadFirstPage(filter);
  }

  const activeFilterLabel = FEED_FILTERS.find((f) => f.value === filter)?.label ?? "";

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-primary">Стрічка</h1>
        <p className="mt-1 text-[13.5px] text-ink-secondary">
          Ідеї, можливості та люди, які можуть змінити твій наступний проєкт.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="glass mt-4 flex w-full items-center gap-3 rounded-2xl border border-border-subtle p-3 text-left transition-colors hover:bg-white/[0.04] sm:p-3.5"
      >
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[12px] font-semibold text-white sm:h-10 sm:w-10">
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt="" fill sizes="40px" className="object-cover" />
          ) : (
            initials(profile?.full_name ?? "?")
          )}
        </div>
        <span className="flex-1 truncate text-[13px] text-ink-tertiary sm:text-[13.5px]">
          Поділіться ідеєю, проєктом чи можливістю...
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-ink-secondary">
          <ImagePlus size={15} />
        </span>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-grad-purple-blue px-3.5 py-1.5 text-[12.5px] font-medium text-white sm:flex">
          <Plus size={14} />
          Створити
        </span>
      </button>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {FEED_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
              filter === f.value
                ? "border-transparent bg-grad-purple-blue text-white shadow-glow-purple"
                : "border-border-subtle text-ink-secondary hover:bg-white/[0.05]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {topMatch ? (
        <div className="mt-5">
          <PotentialMatch userId={userId} match={topMatch} />
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-4">
        {loading ? (
          <>
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </>
        ) : error && items.length === 0 ? (
          <div className="glass rounded-2xl border border-danger/25 p-6 text-center">
            <p className="text-[13.5px] text-ink-secondary">{error}</p>
            <button
              type="button"
              onClick={() => loadFirstPage(filter)}
              className="mt-3 rounded-lg bg-grad-purple-blue px-4 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
            >
              Спробувати ще раз
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="glass rounded-2xl border border-border-subtle p-10 text-center">
            {filter === "for_you" || filter === "new" ? (
              <>
                <p className="font-display text-[16px] font-semibold text-ink-primary">Тут поки тихо.</p>
                <p className="mt-2 text-[13.5px] text-ink-secondary">
                  Створи перший пост і запусти свою першу можливість в ANEXA.
                </p>
              </>
            ) : filter === "saved" ? (
              <p className="text-[13.5px] text-ink-secondary">
                Ви ще нічого не зберегли. Натисніть 🔖 на будь-якому пості, щоб повернутися до нього пізніше.
              </p>
            ) : (
              <p className="text-[13.5px] text-ink-secondary">
                Поки немає постів у категорії «{activeFilterLabel}». Спробуйте інший фільтр або створіть перший.
              </p>
            )}
            {filter !== "saved" ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
              >
                <Plus size={15} />
                Створити пост
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {items.map((item) => (
              <PostCard
                key={item.id}
                item={item}
                userId={userId}
                initiallyLiked={likedIds.has(item.id)}
                initiallySaved={savedIds.has(item.id)}
                onDeleted={handlePostDeleted}
                onUnsaved={filter === "saved" ? handlePostUnsaved : undefined}
              />
            ))}

            <div ref={sentinelRef} className="h-1" />

            {loadingMore ? (
              <div className="flex items-center justify-center gap-2 py-2 text-[12.5px] text-ink-tertiary">
                <Loader2 size={14} className="animate-spin" />
                Завантаження...
              </div>
            ) : hasMore ? (
              <button
                type="button"
                onClick={handleLoadMore}
                className="rounded-lg border border-border-subtle py-2.5 text-[12.5px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.05]"
              >
                Завантажити ще
              </button>
            ) : null}
          </>
        )}
      </div>

      <CreatePostModal
        userId={userId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handlePostCreated}
      />
    </div>
  );
}
