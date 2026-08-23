"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ImagePlus,
  Loader2,
  MessageSquarePlus,
  Radio,
  Search,
  Settings2,
  Share2,
  ShieldOff,
  UserPlus,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  cancelJoinRequest,
  formatMemberCount,
  joinCommunity,
  leaveCommunity,
  requestToJoinCommunity,
  type Community,
  type CommunityMember,
  type CommunityRoleTier,
} from "@/lib/communities";
import {
  approveJoinRequest,
  rejectJoinRequest,
  timeAgo,
  unbanMember,
  type AuditRow,
  type BannedRow,
  type JoinRequestRow,
} from "@/lib/communityAdmin";
import type { EventItem } from "@/lib/events";
import { getCommunityFeed, getUserLikes, getUserSaves, type FeedItem } from "@/lib/feed";
import type { Livestream } from "@/lib/livestreams";
import { getThreads, type DiscussionThread } from "@/lib/discussions";
import { useOnlineUsers } from "@/lib/presence";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";
import ProfilePreviewCard from "@/components/profile/ProfilePreviewCard";
import PostCard from "@/components/feed/PostCard";
import CreatePostModal from "@/components/feed/CreatePostModal";
import EventsView from "@/components/events/EventsView";
import LivestreamPanel from "./LivestreamPanel";
import CommunitySidebar from "./CommunitySidebar";
import EditCommunityModal from "./EditCommunityModal";
import DiscussionThreadCard from "./DiscussionThreadCard";
import CreateThreadModal from "./CreateThreadModal";
import ThreadDetailModal from "./ThreadDetailModal";

type Tab = "feed" | "discussions" | "live" | "events" | "members" | "requests" | "banned" | "audit" | "about";

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
  initialThreads,
  initialPostCount,
  initialActivityCounts,
  initialJoinRequests,
  initialBanned,
  initialAuditLog,
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
  initialThreads: DiscussionThread[];
  initialPostCount: number;
  initialActivityCounts: Record<string, number>;
  initialJoinRequests: JoinRequestRow[];
  initialBanned: BannedRow[];
  initialAuditLog: AuditRow[];
}) {
  const { showToast } = useToast();
  const onlineUsers = useOnlineUsers();

  const [community, setCommunity] = useState(initialCommunity);
  const [pending, setPending] = useState(false);
  const [tab, setTab] = useState<Tab>("feed");
  const [editOpen, setEditOpen] = useState(false);

  const [posts, setPosts] = useState(initialPosts);
  const [likedIds, setLikedIds] = useState(new Set(initialLikedIds));
  const [savedIds, setSavedIds] = useState(new Set(initialSavedIds));
  const [composerOpen, setComposerOpen] = useState(false);

  const [members, setMembers] = useState(initialMembers);
  const [memberQuery, setMemberQuery] = useState("");
  const [postCount, setPostCount] = useState(initialPostCount);

  const [activeLivestream, setActiveLivestream] = useState(initialActiveLivestream);

  const [threads, setThreads] = useState(initialThreads);
  const [threadComposerOpen, setThreadComposerOpen] = useState(false);
  const [openThread, setOpenThread] = useState<DiscussionThread | null>(null);

  const [rulesOpen, setRulesOpen] = useState(true);

  const [joinRequests, setJoinRequests] = useState(initialJoinRequests);
  const [requestBusyId, setRequestBusyId] = useState<string | null>(null);
  const [banned, setBanned] = useState(initialBanned);
  const [banBusyId, setBanBusyId] = useState<string | null>(null);

  const isOwner = community.createdBy === userId;
  const myRole: CommunityRoleTier = members.find((m) => m.userId === userId)?.communityRole ?? "member";
  const isAdmin = isOwner || myRole === "admin";
  const isStaff = isAdmin || myRole === "moderator";
  const owner = useMemo(() => members.find((m) => m.isOwner) ?? null, [members]);

  const filteredMembers = useMemo(() => {
    const term = memberQuery.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) => m.fullName.toLowerCase().includes(term));
  }, [members, memberQuery]);

  const onlineCount = useMemo(
    () => members.filter((m) => onlineUsers.has(m.userId)).length,
    [members, onlineUsers]
  );

  const upcomingEvents = useMemo(
    () => initialEvents.filter((e) => new Date(e.eventDate).getTime() >= Date.now()).slice(0, 3),
    [initialEvents]
  );

  const topMembers = useMemo(() => {
    return members
      .map((member) => ({ member, count: initialActivityCounts[member.userId] ?? 0 }))
      .filter((m) => m.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [members, initialActivityCounts]);

  async function handleToggleMembership() {
    if (pending) return;
    setPending(true);
    try {
      const supabase = createClient();
      if (community.isMember) {
        await leaveCommunity(supabase, userId, community.id);
        setCommunity((c) => ({ ...c, isMember: false, memberCount: c.memberCount - 1 }));
      } else if (community.hasPendingRequest) {
        await cancelJoinRequest(supabase, userId, community.id);
        setCommunity((c) => ({ ...c, hasPendingRequest: false }));
      } else if (community.access === "request") {
        await requestToJoinCommunity(supabase, userId, community.id);
        setCommunity((c) => ({ ...c, hasPendingRequest: true }));
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

  async function decideJoinRequest(request: JoinRequestRow, approve: boolean) {
    setRequestBusyId(request.userId);
    try {
      const supabase = createClient();
      if (approve) {
        await approveJoinRequest(supabase, community.id, request.userId, userId);
      } else {
        await rejectJoinRequest(supabase, community.id, request.userId, userId);
      }
      setJoinRequests((prev) => prev.filter((r) => r.userId !== request.userId));
      if (approve) setCommunity((c) => ({ ...c, memberCount: c.memberCount + 1 }));
    } catch (err) {
      showToast("error", "Не вдалося обробити заявку.");
      console.error("decide join request failed:", err);
    } finally {
      setRequestBusyId(null);
    }
  }

  async function handleUnban(ban: BannedRow) {
    setBanBusyId(ban.userId);
    try {
      await unbanMember(createClient(), community.id, ban.userId, userId);
      setBanned((prev) => prev.filter((b) => b.userId !== ban.userId));
    } catch (err) {
      showToast("error", "Не вдалося розблокувати учасника.");
      console.error("unbanMember failed:", err);
    } finally {
      setBanBusyId(null);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/dashboard/communities/${community.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("success", "Посилання скопійовано.");
    } catch {
      showToast("error", "Не вдалося скопіювати посилання.");
    }
  }

  function handlePostDeleted(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setPostCount((c) => Math.max(c - 1, 0));
  }

  async function handlePostCreated() {
    const supabase = createClient();
    const fresh = await getCommunityFeed(supabase, community.id, 50, userId);
    setPosts(fresh);
    setPostCount((c) => c + 1);
    const ids = fresh.map((p) => p.id);
    const [liked, saved] = await Promise.all([getUserLikes(supabase, userId, ids), getUserSaves(supabase, userId, ids)]);
    setLikedIds(liked);
    setSavedIds(saved);
  }

  function handleThreadCreated(thread: DiscussionThread) {
    setThreads((prev) => [thread, ...prev]);
    setThreadComposerOpen(false);
  }

  function handleThreadDeleted(threadId: string) {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
  }

  function handleRoleChanged(memberId: string, role: CommunityRoleTier) {
    setMembers((prev) => prev.map((m) => (m.userId === memberId ? { ...m, communityRole: role } : m)));
  }

  function handleMemberKicked(memberId: string) {
    setMembers((prev) => prev.filter((m) => m.userId !== memberId));
    setCommunity((c) => ({ ...c, memberCount: Math.max(c.memberCount - 1, 0) }));
  }

  function handleThreadPinnedChange(threadId: string, pinned: boolean) {
    setThreads((prev) =>
      [...prev.map((t) => (t.id === threadId ? { ...t, pinned } : t))].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
    );
    setOpenThread((prev) => (prev && prev.id === threadId ? { ...prev, pinned } : prev));
  }

  const tabs: { id: Tab; label: string; dot?: boolean }[] = [
    { id: "feed", label: "Стрічка" },
    { id: "discussions", label: "Обговорення" },
    { id: "live", label: "Ефір", dot: Boolean(activeLivestream) },
    { id: "events", label: "Події" },
    { id: "members", label: "Учасники" },
    ...(isStaff ? [{ id: "requests" as const, label: "Заявки", dot: joinRequests.length > 0 }] : []),
    ...(isAdmin ? [{ id: "banned" as const, label: "Заблоковані" }] : []),
    ...(isAdmin ? [{ id: "audit" as const, label: "Журнал дій" }] : []),
    { id: "about", label: "Про спільноту" },
  ];

  return (
    <div className="mx-auto max-w-[1360px]">
      <Link
        href="/dashboard/communities"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-ink-tertiary transition-colors hover:text-ink-primary"
      >
        <ArrowLeft size={14} />
        Усі спільноти
      </Link>

      <div className="glass rounded-2xl border border-border-subtle bg-gradient-to-br from-purple/[0.08] via-base-card to-blue/[0.06] p-5">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              src={community.iconUrl}
              name={community.name}
              size={64}
              className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-grad-purple-blue text-[19px] font-semibold text-white"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-lg font-semibold text-ink-primary sm:text-xl">{community.name}</h1>
                {community.category ? (
                  <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] text-ink-secondary">
                    {community.category}
                  </span>
                ) : null}
              </div>
              {community.description ? (
                <p className="mt-1 line-clamp-2 max-w-lg text-[12.5px] text-ink-secondary">{community.description}</p>
              ) : null}
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[12.5px] text-ink-tertiary">
                <span>{formatMemberCount(community.memberCount)}</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(62,207,142,0.7)]" />
                  {onlineCount} онлайн
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3.5 py-2 text-[12px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
              >
                <Settings2 size={13} />
                Керувати
              </button>
            ) : null}
            {community.access === "private" && !community.isMember ? (
              <p className="rounded-lg border border-border-subtle px-4 py-2 text-[12.5px] font-medium text-ink-tertiary">
                Лише за запрошенням
              </p>
            ) : (
              <button
                type="button"
                onClick={handleToggleMembership}
                disabled={pending}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[12.5px] font-medium transition-opacity disabled:opacity-60 ${
                  community.isMember || community.hasPendingRequest
                    ? "border border-border-subtle text-ink-primary hover:bg-white/[0.06]"
                    : "bg-grad-purple-blue text-white shadow-glow-purple hover:opacity-90"
                }`}
              >
                {pending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : community.isMember ? (
                  <Check size={14} />
                ) : community.hasPendingRequest ? (
                  <X size={14} />
                ) : community.access === "request" ? (
                  <Clock size={14} />
                ) : (
                  <UserPlus size={14} />
                )}
                {community.isMember
                  ? "Ви учасник"
                  : community.hasPendingRequest
                    ? "Скасувати заявку"
                    : community.access === "request"
                      ? "Подати заявку"
                      : "Приєднатися"}
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              aria-label="Скопіювати посилання на спільноту"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-ink-secondary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
            >
              <Share2 size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-1 sm:px-2">
        <div className="mt-5 flex items-center gap-5 overflow-x-auto border-b border-border-subtle">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-0.5 pb-3 text-[13.5px] font-medium transition-colors ${
                tab === t.id
                  ? "border-purple-soft text-ink-primary"
                  : "border-transparent text-ink-tertiary hover:text-ink-secondary"
              }`}
            >
              {t.label}
              {t.dot ? <span className="h-1.5 w-1.5 rounded-full bg-danger shadow-[0_0_8px_rgba(239,68,68,0.7)]" /> : null}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 py-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="min-w-0">
            {tab === "feed" ? (
              <div className="flex flex-col gap-4">
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

                {activeLivestream ? (
                  <div className="relative overflow-hidden rounded-2xl border border-danger/30 bg-gradient-to-br from-danger/[0.12] via-purple/[0.1] to-transparent p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg bg-base-surface">
                          <Radio size={16} className="text-danger" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold text-ink-primary">{activeLivestream.title}</p>
                          <p className="text-[12px] text-ink-tertiary">{activeLivestream.hostName}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTab("live")}
                        className="shrink-0 rounded-lg bg-danger px-4 py-2 text-[12.5px] font-medium text-white shadow-glow-purple"
                      >
                        Дивитися ефір
                      </button>
                    </div>
                  </div>
                ) : null}

                {posts.length === 0 ? (
                  <div className="glass rounded-2xl border border-border-subtle p-6 text-center">
                    <p className="text-[13px] text-ink-tertiary">Тут поки немає постів.</p>
                  </div>
                ) : (
                  posts.map((item) => (
                    <PostCard
                      key={item.id}
                      item={item}
                      userId={userId}
                      initiallyLiked={likedIds.has(item.id)}
                      initiallySaved={savedIds.has(item.id)}
                      onDeleted={handlePostDeleted}
                      canModerate={isStaff}
                    />
                  ))
                )}
              </div>
            ) : null}

            {tab === "discussions" ? (
              <div className="flex flex-col gap-3">
                {community.isMember ? (
                  <button
                    type="button"
                    onClick={() => setThreadComposerOpen(true)}
                    className="glass flex w-full items-center gap-3 rounded-2xl border border-border-subtle p-3 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-ink-secondary">
                      <MessageSquarePlus size={16} />
                    </span>
                    <span className="flex-1 truncate text-[13px] text-ink-tertiary">Почати обговорення...</span>
                  </button>
                ) : null}

                {threads.length === 0 ? (
                  <div className="glass rounded-2xl border border-border-subtle p-6 text-center">
                    <p className="text-[13px] text-ink-tertiary">Поки немає обговорень.</p>
                  </div>
                ) : (
                  threads.map((thread) => (
                    <DiscussionThreadCard key={thread.id} thread={thread} onOpen={() => setOpenThread(thread)} />
                  ))
                )}
              </div>
            ) : null}

            {tab === "live" ? (
              <LivestreamPanel
                userId={userId}
                communityId={community.id}
                canHost={isAdmin}
                active={activeLivestream}
                onActiveChange={setActiveLivestream}
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
                  <div className="flex flex-col gap-2">
                    {filteredMembers.map((m) => (
                      <ProfilePreviewCard key={m.userId} userId={m.userId}>
                        <div className="glass flex items-center gap-3 rounded-2xl border border-border-subtle p-3.5">
                          <div className="relative shrink-0">
                            <Avatar
                              src={m.avatarUrl}
                              name={m.fullName}
                              size={40}
                              className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[12px] font-semibold text-white"
                            />
                            {onlineUsers.has(m.userId) ? (
                              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-base bg-success" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-[13px] font-medium text-ink-primary">{m.fullName}</p>
                              {m.isOwner ? (
                                <span className="shrink-0 rounded-md bg-purple/10 px-2 py-0.5 text-[10.5px] font-medium text-purple-soft">
                                  Власник
                                </span>
                              ) : m.communityRole === "admin" ? (
                                <span className="shrink-0 rounded-md bg-blue/10 px-2 py-0.5 text-[10.5px] font-medium text-blue">
                                  Адмін
                                </span>
                              ) : m.communityRole === "moderator" ? (
                                <span className="shrink-0 rounded-md bg-success/10 px-2 py-0.5 text-[10.5px] font-medium text-success">
                                  Модератор
                                </span>
                              ) : null}
                            </div>
                            {m.roleTitle || m.company ? (
                              <p className="truncate text-[11.5px] text-ink-tertiary">
                                {[m.roleTitle, m.company].filter(Boolean).join(" · ")}
                              </p>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[13px] font-semibold text-purple-soft">
                              {initialActivityCounts[m.userId] ?? 0}
                            </p>
                            <p className="text-[10.5px] text-ink-tertiary">внесків</p>
                          </div>
                        </div>
                      </ProfilePreviewCard>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {tab === "requests" ? (
              <div className="flex flex-col gap-2">
                {joinRequests.length === 0 ? (
                  <div className="glass rounded-2xl border border-border-subtle p-6 text-center">
                    <p className="text-[13px] text-ink-tertiary">Заявок на вступ немає.</p>
                  </div>
                ) : (
                  joinRequests.map((r) => (
                    <div key={r.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl border border-border-subtle p-3.5">
                      <Avatar
                        src={r.avatarUrl}
                        name={r.fullName}
                        size={40}
                        className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[12px] font-semibold text-white"
                      />
                      <div className="min-w-[160px] flex-1">
                        <p className="text-[13px] font-medium text-ink-primary">{r.fullName}</p>
                        {r.roleTitle || r.company ? (
                          <p className="text-[11.5px] text-ink-tertiary">{[r.roleTitle, r.company].filter(Boolean).join(" · ")}</p>
                        ) : null}
                        {r.note ? <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">«{r.note}»</p> : null}
                      </div>
                      <p className="shrink-0 text-[11px] text-ink-tertiary">{timeAgo(r.createdAt)}</p>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={requestBusyId === r.userId}
                          onClick={() => decideJoinRequest(r, true)}
                          className="rounded-lg border border-success/30 bg-success/[0.14] px-3 py-1.5 text-[12px] font-medium text-success transition-colors hover:bg-success/[0.22] disabled:opacity-60"
                        >
                          Схвалити
                        </button>
                        <button
                          type="button"
                          disabled={requestBusyId === r.userId}
                          onClick={() => decideJoinRequest(r, false)}
                          className="rounded-lg border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.09] disabled:opacity-60"
                        >
                          Відхилити
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {tab === "banned" ? (
              <div className="flex flex-col gap-2">
                {banned.length === 0 ? (
                  <div className="glass flex flex-col items-center gap-2 rounded-2xl border border-border-subtle p-8 text-center">
                    <ShieldOff size={18} className="text-ink-tertiary" />
                    <p className="text-[13px] text-ink-tertiary">Немає заблокованих учасників.</p>
                  </div>
                ) : (
                  banned.map((b) => (
                    <div key={b.userId} className="flex flex-wrap items-center gap-3 rounded-2xl border border-danger/20 bg-danger/[0.05] p-3.5">
                      <Avatar
                        src={b.avatarUrl}
                        name={b.fullName}
                        size={40}
                        className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-[12px] font-semibold text-ink-secondary"
                      />
                      <div className="min-w-[160px] flex-1">
                        <p className="text-[13px] font-medium text-ink-secondary">{b.fullName}</p>
                        {b.reason ? <p className="text-[11.5px] text-ink-tertiary">{b.reason}</p> : null}
                      </div>
                      <div className="shrink-0 text-right">
                        {b.bannedByName ? <p className="text-[11px] text-ink-tertiary">{b.bannedByName}</p> : null}
                        <p className="text-[11px] text-ink-tertiary">{timeAgo(b.createdAt)}</p>
                      </div>
                      <button
                        type="button"
                        disabled={banBusyId === b.userId}
                        onClick={() => handleUnban(b)}
                        className="shrink-0 rounded-lg border border-border-subtle bg-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-ink-primary transition-colors hover:bg-white/[0.1] disabled:opacity-60"
                      >
                        Розблокувати
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {tab === "audit" ? (
              <div className="rounded-2xl border border-border-subtle bg-white/[0.028] px-4">
                {initialAuditLog.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-ink-tertiary">Дій ще не було.</p>
                ) : (
                  initialAuditLog.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 border-b border-white/[0.05] py-3 last:border-0">
                      <div className="min-w-[160px] flex-1">
                        <p className="text-[13px] text-ink-secondary">{a.action}</p>
                        {a.actorName ? <p className="text-[11px] text-ink-tertiary">{a.actorName}</p> : null}
                      </div>
                      <span className="shrink-0 text-[11px] text-ink-tertiary">{timeAgo(a.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {tab === "about" ? (
              <div className="flex flex-col gap-4">
                <div className="glass rounded-2xl border border-border-subtle p-5">
                  <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Опис</h3>
                  <p className="text-[13.5px] leading-relaxed text-ink-secondary">
                    {community.description || "Опис ще не додано."}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-border-subtle bg-white/[0.03] p-3.5">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-tertiary">Створено</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[13.5px] font-medium text-ink-primary">
                        <Calendar size={12} />
                        {new Date(community.createdAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border-subtle bg-white/[0.03] p-3.5">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-tertiary">Категорія</p>
                      <p className="mt-1 text-[13.5px] font-medium text-ink-primary">{community.category || "—"}</p>
                    </div>
                    <div className="rounded-xl border border-border-subtle bg-white/[0.03] p-3.5">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-tertiary">Учасників</p>
                      <p className="mt-1 text-[13.5px] font-medium text-ink-primary">{community.memberCount}</p>
                    </div>
                    <div className="rounded-xl border border-border-subtle bg-white/[0.03] p-3.5">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-tertiary">Власник</p>
                      <ProfilePreviewCard userId={community.createdBy ?? userId}>
                        <p className="mt-1 truncate text-[13.5px] font-medium text-ink-primary hover:underline">
                          {owner?.fullName ?? "—"}
                        </p>
                      </ProfilePreviewCard>
                    </div>
                  </div>
                </div>

                <div className="glass rounded-2xl border border-border-subtle p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[14.5px] font-semibold text-ink-primary">Правила спільноти</h3>
                    <button
                      type="button"
                      onClick={() => setRulesOpen((s) => !s)}
                      className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-[12px] text-ink-secondary transition-colors hover:text-ink-primary"
                    >
                      {rulesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {rulesOpen ? "Сховати" : "Показати"}
                    </button>
                  </div>
                  {rulesOpen ? (
                    community.rules.length === 0 ? (
                      <p className="mt-3 text-[12.5px] text-ink-tertiary">Правила ще не додано.</p>
                    ) : (
                      <div className="mt-4 flex flex-col gap-2.5">
                        {community.rules.map((rule, i) => (
                          <div key={i} className="flex gap-3 rounded-xl border border-border-subtle bg-white/[0.03] p-3.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-purple/15 text-[12px] font-semibold text-purple-soft">
                              {i + 1}
                            </span>
                            <div>
                              <p className="text-[13.5px] font-semibold text-ink-primary">{rule.title}</p>
                              {rule.body ? (
                                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-tertiary">{rule.body}</p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <CommunitySidebar
            memberCount={community.memberCount}
            postCount={postCount}
            onlineCount={onlineCount}
            owner={owner}
            upcomingEvents={upcomingEvents}
            topMembers={topMembers}
            onSelectEvents={() => setTab("events")}
          />
        </div>
      </div>

      <CreatePostModal
        userId={userId}
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={handlePostCreated}
        communityId={community.id}
      />

      {threadComposerOpen ? (
        <CreateThreadModal
          userId={userId}
          communityId={community.id}
          onClose={() => setThreadComposerOpen(false)}
          onCreated={handleThreadCreated}
        />
      ) : null}

      {openThread ? (
        <ThreadDetailModal
          userId={userId}
          thread={openThread}
          canModerate={isStaff}
          onClose={() => setOpenThread(null)}
          onPinnedChange={handleThreadPinnedChange}
          onThreadDeleted={handleThreadDeleted}
        />
      ) : null}

      {editOpen ? (
        <EditCommunityModal
          community={community}
          members={members}
          isOwner={isOwner}
          isAdmin={isAdmin}
          onClose={() => setEditOpen(false)}
          onSaved={(fields) => {
            setCommunity((c) => ({ ...c, ...fields }));
            setEditOpen(false);
            showToast("success", "Зміни збережено.");
          }}
          onRoleChanged={handleRoleChanged}
          onMemberKicked={handleMemberKicked}
        />
      ) : null}
    </div>
  );
}
