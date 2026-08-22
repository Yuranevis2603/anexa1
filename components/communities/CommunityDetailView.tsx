"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Check, ImagePlus, Loader2, Search, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type Community, type CommunityMember, formatMemberCount, joinCommunity, leaveCommunity } from "@/lib/communities";
import type { EventItem } from "@/lib/events";
import { getCommunityFeed, getUserLikes, getUserSaves, type FeedItem } from "@/lib/feed";
import type { Livestream } from "@/lib/livestreams";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";
import ProfilePreviewCard from "@/components/profile/ProfilePreviewCard";
import PostCard from "@/components/feed/PostCard";
import CreatePostModal from "@/components/feed/CreatePostModal";
import EventsView from "@/components/events/EventsView";
import LivestreamPanel from "./LivestreamPanel";

type Tab = "feed" | "discussions" | "live" | "events" | "members" | "about";

export default function CommunityDetailView({
  userId,
  initialCommunity,
  initialEvents,
  initialPosts,
  initialLikedIds,
  initialSavedIds,
  initialMembers,
  initialActiveLivestream,
  initialPastLivestreams,
}: {
  userId: string;
  initialCommunity: Community;
  initialEvents: EventItem[];
  initialPosts: FeedItem[];
  initialLikedIds: string[];
  initialSavedIds: string[];
  initialMembers: CommunityMember[];
  initialActiveLivestream: Livestream | null;
  initialPastLivestreams: Livestream[];
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [community, setCommunity] = useState(initialCommunity);
  const [pending, setPending] = useState(false);
  const [tab, setTab] = useState<Tab>("feed");

  const [posts, setPosts] = useState(initialPosts);
  const [likedIds, setLikedIds] = useState(new Set(initialLikedIds));
  const [savedIds, setSavedIds] = useState(new Set(initialSavedIds));
  const [composerOpen, setComposerOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");

  useEffect(() => setPosts(initialPosts), [initialPosts]);
  useEffect(() => setLikedIds(new Set(initialLikedIds)), [initialLikedIds]);
  useEffect(() => setSavedIds(new Set(initialSavedIds)), [initialSavedIds]);

  const isOwner = community.createdBy === userId;
  const discussions = useMemo(() => posts.filter((p) => Boolean(p.category)), [posts]);
  const filteredMembers = useMemo(() => {
    const term = memberQuery.trim().toLowerCase();
    if (!term) return initialMembers;
    return initialMembers.filter((m) => m.fullName.toLowerCase().includes(term));
  }, [initialMembers, memberQuery]);

  async function handleToggleMembership() {
    if (pending) return;
    setPending(true);
    try {
      const supabase = createClient();
      if (community.isMember) {
        await leaveCommunity(supabase, userId, community.id);
        setCommunity((c) => ({ ...c, isMember: false, memberCount: c.memberCount - 1 }));
      } else {
        await joinCommunity(supabase, userId, community.id);
        setCommunity((c) => ({ ...c, isMember: true, memberCount: c.memberCount + 1 }));
      }
    } catch (err) {
      showToast("error", community.isMember ? "Не вдалося вийти зі спільноти." : "Не вдалося приєднатися.");
      console.error("community membership toggle failed:", err);
    } finally {
      setPending(false);
    }
  }

  function handlePostDeleted(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  async function handlePostCreated() {
    const supabase = createClient();
    const fresh = await getCommunityFeed(supabase, community.id);
    setPosts(fresh);
    const ids = fresh.map((p) => p.id);
    const [liked, saved] = await Promise.all([getUserLikes(supabase, userId, ids), getUserSaves(supabase, userId, ids)]);
    setLikedIds(liked);
    setSavedIds(saved);
    router.refresh();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "feed", label: "Стрічка" },
    { id: "discussions", label: "Обговорення" },
    { id: "live", label: "Ефір" },
    { id: "events", label: "Події" },
    { id: "members", label: "Учасники" },
    { id: "about", label: "Про спільноту" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/communities"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-ink-tertiary transition-colors hover:text-ink-primary"
      >
        <ArrowLeft size={14} />
        Усі спільноти
      </Link>

      <div className="glass flex flex-col items-center gap-3 rounded-2xl border border-border-subtle p-6 text-center sm:flex-row sm:text-left">
        <Avatar
          src={community.iconUrl}
          name={community.name}
          size={64}
          className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[18px] font-semibold text-white"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="font-display text-lg font-semibold text-ink-primary">{community.name}</h1>
            {community.category ? (
              <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] text-ink-secondary">
                {community.category}
              </span>
            ) : null}
          </div>
          {community.description ? (
            <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-secondary">{community.description}</p>
          ) : null}
          <p className="mt-1 text-[12.5px] text-ink-tertiary">{formatMemberCount(community.memberCount)}</p>
        </div>
        <button
          type="button"
          onClick={handleToggleMembership}
          disabled={pending}
          className={`flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-[12.5px] font-medium transition-opacity disabled:opacity-60 ${
            community.isMember
              ? "border border-border-subtle text-ink-primary hover:bg-white/[0.06]"
              : "bg-grad-purple-blue text-white shadow-glow-purple hover:opacity-90"
          }`}
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : community.isMember ? (
            <Check size={14} />
          ) : (
            <UserPlus size={14} />
          )}
          {community.isMember ? "Ви учасник" : "Приєднатися"}
        </button>
      </div>

      <div className="mt-5 flex items-center gap-5 overflow-x-auto border-b border-border-subtle">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 border-b-2 px-0.5 pb-3 text-[13.5px] font-medium transition-colors ${
              tab === t.id
                ? "border-purple-soft text-ink-primary"
                : "border-transparent text-ink-tertiary hover:text-ink-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "feed" || tab === "discussions" ? (
          <div>
            {community.isMember ? (
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="glass flex w-full items-center gap-3 rounded-2xl border border-border-subtle p-3 text-left transition-colors hover:bg-white/[0.04]"
              >
                <Avatar
                  src={null}
                  name="?"
                  size={36}
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[12px] font-semibold text-white"
                />
                <span className="flex-1 truncate text-[13px] text-ink-tertiary">
                  Поділіться чимось зі спільнотою...
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-ink-secondary">
                  <ImagePlus size={15} />
                </span>
              </button>
            ) : null}

            <div className="mt-4 flex flex-col gap-4">
              {(tab === "feed" ? posts : discussions).length === 0 ? (
                <div className="glass rounded-2xl border border-border-subtle p-6 text-center">
                  <p className="text-[13px] text-ink-tertiary">
                    {tab === "feed" ? "Тут поки немає постів." : "Поки немає обговорень."}
                  </p>
                </div>
              ) : (
                (tab === "feed" ? posts : discussions).map((item) => (
                  <PostCard
                    key={item.id}
                    item={item}
                    userId={userId}
                    initiallyLiked={likedIds.has(item.id)}
                    initiallySaved={savedIds.has(item.id)}
                    onDeleted={handlePostDeleted}
                  />
                ))
              )}
            </div>
          </div>
        ) : null}

        {tab === "live" ? (
          <LivestreamPanel
            userId={userId}
            communityId={community.id}
            isOwner={isOwner}
            initialActive={initialActiveLivestream}
            initialPast={initialPastLivestreams}
          />
        ) : null}

        {tab === "events" ? (
          <EventsView userId={userId} initialEvents={initialEvents} communityId={community.id} showTitle={false} />
        ) : null}

        {tab === "members" ? (
          <div>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2">
              <Search size={15} className="shrink-0 text-ink-tertiary" />
              <input
                type="text"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Пошук учасників..."
                className="w-full min-w-0 bg-transparent text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
              />
            </div>

            {filteredMembers.length === 0 ? (
              <div className="glass rounded-2xl border border-border-subtle p-6 text-center">
                <p className="text-[13px] text-ink-tertiary">Немає учасників за вашим запитом.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredMembers.map((m) => (
                  <ProfilePreviewCard key={m.userId} userId={m.userId}>
                    <div className="glass flex items-center gap-3 rounded-2xl border border-border-subtle p-3.5">
                      <Avatar
                        src={m.avatarUrl}
                        name={m.fullName}
                        size={40}
                        className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[12px] font-semibold text-white"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink-primary">{m.fullName}</p>
                        {m.roleTitle || m.company ? (
                          <p className="truncate text-[11.5px] text-ink-tertiary">
                            {[m.roleTitle, m.company].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      {m.isOwner ? (
                        <span className="shrink-0 rounded-md bg-purple/10 px-2 py-0.5 text-[10.5px] font-medium text-purple-soft">
                          Власник
                        </span>
                      ) : null}
                    </div>
                  </ProfilePreviewCard>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === "about" ? (
          <div className="glass flex flex-col gap-4 rounded-2xl border border-border-subtle p-5">
            <div>
              <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">Опис</h3>
              <p className="text-[13.5px] leading-relaxed text-ink-secondary">
                {community.description || "Опис ще не додано."}
              </p>
            </div>

            {community.category ? (
              <div>
                <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">Категорія</h3>
                <p className="text-[13.5px] text-ink-secondary">{community.category}</p>
              </div>
            ) : null}

            <div>
              <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">Власник</h3>
              <ProfilePreviewCard userId={community.createdBy ?? userId}>
                <span className="text-[13.5px] text-ink-primary hover:underline">
                  {initialMembers.find((m) => m.isOwner)?.fullName ?? "—"}
                </span>
              </ProfilePreviewCard>
            </div>

            <div>
              <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">Створено</h3>
              <p className="flex items-center gap-1.5 text-[13.5px] text-ink-secondary">
                <Calendar size={13} />
                {new Date(community.createdAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">
                <Users size={12} />
                Учасники
              </h3>
              <div className="flex -space-x-2">
                {initialMembers.slice(0, 10).map((m) => (
                  <Avatar
                    key={m.userId}
                    src={m.avatarUrl}
                    name={m.fullName}
                    size={28}
                    className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-base bg-grad-purple-blue text-[10px] font-semibold text-white"
                  />
                ))}
                {community.memberCount > 10 ? (
                  <span className="relative z-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-base bg-white/[0.08] text-[10px] text-ink-secondary">
                    +{community.memberCount - 10}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <CreatePostModal
        userId={userId}
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={handlePostCreated}
        communityId={community.id}
      />
    </div>
  );
}
