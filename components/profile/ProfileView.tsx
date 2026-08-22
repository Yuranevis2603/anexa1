"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Ban,
  BadgeCheck,
  Check,
  Flag,
  FolderKanban,
  Handshake,
  Loader2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Sparkles,
  Star,
  Trophy,
  UserPlus,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { profileCompleteness, type Profile } from "@/lib/profile";
import { getOrCreateConversation } from "@/lib/messages";
import { acceptConnection, getViewerRelation, requestConnection, type ConnectionState } from "@/lib/connections";
import { follow, unfollow } from "@/lib/follows";
import { blockUser, unblockUser } from "@/lib/moderation";
import {
  computeLevelProgress,
  getLevels,
  getProfileStats,
  type Level,
  type LevelProgress,
  type ProfileStats,
} from "@/lib/gamification";
import { getUserActivity, getUserLikes, getUserSaves, type FeedItem } from "@/lib/feed";
import { getProjects, type Project } from "@/lib/projects";
import { useToast } from "@/components/ui/ToastProvider";
import EditProfileModal from "./EditProfileModal";
import CreateProjectModal from "./CreateProjectModal";
import ReviewModal from "./ReviewModal";
import ReportModal from "./ReportModal";
import GamificationInfoModal from "./GamificationInfoModal";
import PostCard from "@/components/feed/PostCard";
import Avatar from "@/components/ui/Avatar";
import ModalPortal from "@/components/ui/ModalPortal";

function Ring({
  size = 76,
  thickness = 3,
  percent = 100,
  children,
}: {
  size?: number;
  thickness?: number;
  percent?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(#7C5CFF 0%, #4E8CFF ${percent}%, rgba(255,255,255,0.08) ${percent}%)`,
          WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - ${thickness}px))`,
          mask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - ${thickness}px))`,
        }}
      />
      <div
        className="flex items-center justify-center rounded-full bg-base"
        style={{ width: size - thickness * 2 - 6, height: size - thickness * 2 - 6 }}
      >
        {children}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-ink-primary">
      {children}
    </span>
  );
}

function SectionCard({ title, icon: Icon, action, children }: { title: string; icon?: LucideIcon; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl border border-border-subtle p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon ? <Icon size={13} className="text-ink-tertiary" /> : null}
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ text, cta, onClick }: { text: string; cta?: string; onClick?: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border-subtle px-4 py-6 text-center">
      <p className="text-[12.5px] text-ink-tertiary">{text}</p>
      {cta && onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-ink-primary transition-colors hover:bg-white/[0.07]"
        >
          <Plus size={12} /> {cta}
        </button>
      ) : null}
    </div>
  );
}

export default function ProfileView({
  profile,
  viewerIsOwner = true,
  viewerId,
}: {
  profile: Profile;
  viewerIsOwner?: boolean;
  viewerId?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [current, setCurrent] = useState(profile);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activity, setActivity] = useState<FeedItem[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<ProfileStats>({
    ax_points: 0,
    reputation: null,
    review_count: 0,
    level: 1,
    levelTitle: "Starter",
  });
  const [levels, setLevels] = useState<Level[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const [connectionState, setConnectionState] = useState<ConnectionState>({ status: "none" });
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [gamificationInfoOpen, setGamificationInfoOpen] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"activity" | "info">("activity");

  const completeness = profileCompleteness(current);
  const canInteract = !viewerIsOwner && Boolean(viewerId);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      setLoadingSections(true);
      const [projectsData, activityData, statsData, levelsData] = await Promise.all([
        getProjects(supabase, current.id),
        getUserActivity(supabase, current.id),
        getProfileStats(supabase, current.id),
        getLevels(supabase),
      ]);
      if (cancelled) return;
      setProjects(projectsData);
      setActivity(activityData);
      setStats(statsData);
      setLevels(levelsData);
      setLoadingSections(false);

      if (viewerId && activityData.length > 0) {
        const ids = activityData.map((item) => item.id);
        const [liked, saved] = await Promise.all([
          getUserLikes(supabase, viewerId, ids),
          getUserSaves(supabase, viewerId, ids),
        ]);
        if (cancelled) return;
        setLikedIds(liked);
        setSavedIds(saved);
      }

      if (canInteract && viewerId) {
        const relation = await getViewerRelation(supabase, viewerId, current.id);
        if (cancelled) return;
        setFollowing(relation.following);
        setBlocked(relation.blocked);
        setHasReviewed(relation.reviewed);
        setConnectionState(relation.connection);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id]);

  // Only the owner has a real ax_points value to compute progress-to-next-level
  // from (see getProfileStats) — for anyone else, show the accurate level/title
  // from the public stats RPC without a percent ring that would leak how close
  // to their raw AX balance they are.
  const levelProgress: LevelProgress = viewerIsOwner
    ? computeLevelProgress(stats.ax_points, levels)
    : { level: stats.level, title: stats.levelTitle, progressPercent: 100, nextLevelAx: null };

  async function handleMessage() {
    if (!viewerId || startingChat) return;
    setStartingChat(true);
    try {
      const supabase = createClient();
      const conversationId = await getOrCreateConversation(supabase, viewerId, current.id);
      router.push(`/dashboard/messages?c=${conversationId}`);
    } catch (err) {
      showToast("error", "Не вдалося відкрити чат.");
      console.error("getOrCreateConversation failed:", err);
      setStartingChat(false);
    }
  }

  async function handleCollaborate() {
    if (!viewerId || connectionLoading || connectionState.status !== "none") return;
    setConnectionLoading(true);
    try {
      const supabase = createClient();
      await requestConnection(supabase, viewerId, current.id);
      setConnectionState({ status: "pending_sent" });
      showToast("success", "Запит на співпрацю надіслано.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося надіслати запит.");
    } finally {
      setConnectionLoading(false);
    }
  }

  async function handleAcceptConnection() {
    if (connectionLoading || connectionState.status !== "pending_received") return;
    setConnectionLoading(true);
    try {
      const supabase = createClient();
      await acceptConnection(supabase, connectionState.connectionId);
      setConnectionState({ status: "connected" });
      showToast("success", `Тепер ви знайомі з ${current.full_name}.`);
      router.refresh(); // keeps the sidebar's pending-requests badge in sync
    } catch (err) {
      showToast("error", "Не вдалося прийняти запит.");
      console.error("acceptConnection failed:", err);
    } finally {
      setConnectionLoading(false);
    }
  }

  async function handleToggleFollow() {
    if (!viewerId || followLoading) return;
    setFollowLoading(true);
    const was = following;
    setFollowing(!was);
    try {
      const supabase = createClient();
      if (was) await unfollow(supabase, viewerId, current.id);
      else await follow(supabase, viewerId, current.id);
    } catch (err) {
      setFollowing(was);
      showToast("error", "Не вдалося оновити підписку.");
      console.error("toggle follow failed:", err);
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleToggleBlock() {
    if (!viewerId || blockLoading) return;
    setBlockLoading(true);
    const was = blocked;
    setBlocked(!was);
    setMenuOpen(false);
    try {
      const supabase = createClient();
      if (was) await unblockUser(supabase, viewerId, current.id);
      else await blockUser(supabase, viewerId, current.id);
      showToast("success", was ? "Розблоковано." : "Користувача заблоковано.");
    } catch (err) {
      setBlocked(was);
      showToast("error", "Не вдалося оновити статус блокування.");
      console.error("toggle block failed:", err);
    } finally {
      setBlockLoading(false);
    }
  }

  async function handleShare() {
    const path = viewerIsOwner ? "/dashboard/profile" : `/dashboard/people/${current.id}`;
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("success", "Посилання на профіль скопійовано.");
    } catch {
      showToast("error", "Не вдалося скопіювати посилання.");
    }
    setMenuOpen(false);
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* ---------------- HEADER ---------------- */}
      <section className="glass relative rounded-2xl border border-border-subtle p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Ring size={84} thickness={2.5} percent={completeness}>
            <Avatar
              src={current.avatar_url}
              name={current.full_name}
              size={80}
              className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-base-card text-xl font-semibold text-ink-primary"
            />
          </Ring>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-ink-primary">{current.full_name}</h1>
              {current.is_approved ? <BadgeCheck size={17} className="text-blue" /> : null}
            </div>
            <p className="mt-0.5 text-[13.5px] text-ink-secondary">
              {current.username ? `@${current.username} · ` : ""}
              {[current.role_title, current.company].filter(Boolean).join(" · ") || "Посада та компанія ще не вказані"}
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {current.location ? (
                <span className="flex items-center gap-1.5 text-[12px] text-ink-tertiary">
                  <MapPin size={12} /> {current.location}
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {viewerIsOwner ? (
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
                >
                  <Pencil size={14} /> Редагувати профіль
                </button>
              ) : canInteract ? (
                <>
                  <button
                    onClick={handleMessage}
                    disabled={startingChat}
                    className="flex items-center gap-1.5 rounded-xl bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {startingChat ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                    Написати
                  </button>
                  {connectionState.status === "pending_received" ? (
                    <button
                      onClick={handleAcceptConnection}
                      disabled={connectionLoading}
                      className="flex items-center gap-1.5 rounded-xl bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {connectionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Прийняти запит
                    </button>
                  ) : connectionState.status === "pending_sent" || connectionState.status === "connected" ? (
                    <span className="flex items-center gap-1.5 rounded-xl border border-border-subtle px-4 py-2 text-[13px] font-medium text-ink-tertiary">
                      <Check size={14} />
                      {connectionState.status === "connected" ? "Ви знайомі" : "Запит надіслано"}
                    </span>
                  ) : (
                    <button
                      onClick={handleCollaborate}
                      disabled={connectionLoading}
                      className="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-white/[0.04] px-4 py-2 text-[13px] font-medium text-ink-primary transition-colors hover:bg-white/[0.07] disabled:opacity-60"
                    >
                      {connectionLoading ? <Loader2 size={14} className="animate-spin" /> : <Handshake size={14} />}
                      Співпраця
                    </button>
                  )}
                  <button
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-60 ${
                      following ? "bg-purple/10 text-purple-soft" : "border border-border-subtle text-ink-secondary hover:bg-white/[0.04]"
                    }`}
                  >
                    <UserPlus size={14} /> {following ? "Підписані" : "Підписатись"}
                  </button>
                </>
              ) : null}

              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Ще дії"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-white/[0.04] text-ink-secondary transition-colors hover:bg-white/[0.07]"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* An anchored dropdown here fights flex-wrap on narrow screens (the
          "..." button isn't always pinned to a screen edge), so this is a
          fixed action sheet instead — same modal pattern as EditProfileModal
          etc., just anchored to the viewport, not the trigger button. */}
      {menuOpen ? (
        <ModalPortal>
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4"
          onClick={() => setMenuOpen(false)}
          role="presentation"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass w-full max-w-sm overflow-hidden rounded-t-2xl border border-border-subtle bg-base-card sm:rounded-2xl"
          >
            <button
              onClick={handleShare}
              className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left text-[13.5px] text-ink-primary transition-colors hover:bg-white/[0.05]"
            >
              <Share2 size={15} /> {viewerIsOwner ? "Копіювати посилання" : "Поділитися профілем"}
            </button>
            {canInteract ? (
              <>
                {!hasReviewed ? (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setReviewModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 border-t border-border-subtle px-4 py-3.5 text-left text-[13.5px] text-ink-primary transition-colors hover:bg-white/[0.05]"
                  >
                    <Star size={15} /> Оцінити співпрацю
                  </button>
                ) : null}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setReportModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 border-t border-border-subtle px-4 py-3.5 text-left text-[13.5px] text-ink-primary transition-colors hover:bg-white/[0.05]"
                >
                  <Flag size={15} /> Поскаржитись
                </button>
                <button
                  onClick={handleToggleBlock}
                  disabled={blockLoading}
                  className="flex w-full items-center gap-2.5 border-t border-border-subtle px-4 py-3.5 text-left text-[13.5px] text-danger transition-colors hover:bg-white/[0.05] disabled:opacity-60"
                >
                  <Ban size={15} /> {blocked ? "Розблокувати" : "Заблокувати"}
                </button>
              </>
            ) : null}
            <button
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center border-t border-border-subtle px-4 py-3.5 text-[13.5px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.05]"
            >
              Скасувати
            </button>
          </div>
        </div>
        </ModalPortal>
      ) : null}

      {/* ---------------- METRICS ---------------- */}
      <div className={`mt-4 grid grid-cols-1 gap-3 ${viewerIsOwner ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <button
          type="button"
          onClick={() => setGamificationInfoOpen(true)}
          className="glass flex items-center gap-3 rounded-2xl border border-border-subtle p-4 text-left transition-colors hover:bg-white/[0.03]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10">
            <Star size={17} className="text-gold" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">Репутація</p>
            <p className="font-display text-lg font-semibold leading-tight text-ink-primary">
              {stats.reputation !== null ? stats.reputation.toFixed(1) : "—"}
              {stats.reputation !== null ? <span className="ml-1 text-xs font-normal text-ink-tertiary">/ 5 · {stats.review_count}</span> : null}
            </p>
          </div>
        </button>
        {viewerIsOwner ? (
          <button
            type="button"
            onClick={() => setGamificationInfoOpen(true)}
            className="glass flex items-center gap-3 rounded-2xl border border-border-subtle p-4 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue/10">
              <Zap size={17} className="text-blue" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">AX</p>
              <p className="font-display text-lg font-semibold leading-tight text-ink-primary">{stats.ax_points.toLocaleString("uk-UA")}</p>
            </div>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setGamificationInfoOpen(true)}
          className="glass flex items-center gap-3 rounded-2xl border border-border-subtle p-4 text-left transition-colors hover:bg-white/[0.03]"
        >
          <Ring size={40} thickness={2.5} percent={levelProgress.progressPercent}>
            <div className="flex h-full w-full items-center justify-center rounded-full bg-base-card">
              <Trophy size={15} className="text-purple-soft" />
            </div>
          </Ring>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">Рівень</p>
            <p className="font-display text-lg font-semibold leading-tight text-ink-primary">
              {levelProgress.level}
              <span className="ml-1 text-xs font-normal text-ink-tertiary">{levelProgress.title}</span>
            </p>
          </div>
        </button>
      </div>

      {/* ---------------- TABS ---------------- */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
            activeTab === "activity"
              ? "border-transparent bg-grad-purple-blue text-white shadow-glow-purple"
              : "border-border-subtle text-ink-secondary hover:bg-white/[0.05]"
          }`}
        >
          Активність
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
            activeTab === "info"
              ? "border-transparent bg-grad-purple-blue text-white shadow-glow-purple"
              : "border-border-subtle text-ink-secondary hover:bg-white/[0.05]"
          }`}
        >
          Інформація
        </button>
      </div>

      {activeTab === "activity" ? (
        <div className="mt-4">
          <SectionCard title="Остання активність" icon={Sparkles}>
            {loadingSections ? (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <p className="text-[13.5px] text-ink-tertiary">Активності поки немає.</p>
            ) : !viewerId ? (
              <p className="text-[13.5px] text-ink-tertiary">Увійдіть, щоб переглянути активність.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {activity.map((item) => (
                  <PostCard
                    key={item.id}
                    item={item}
                    userId={viewerId}
                    initiallyLiked={likedIds.has(item.id)}
                    initiallySaved={savedIds.has(item.id)}
                    onDeleted={(id) => setActivity((prev) => prev.filter((a) => a.id !== id))}
                  />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-4 md:col-span-2">
            <SectionCard title="Про мене">
              {current.bio ? (
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-secondary">{current.bio}</p>
              ) : viewerIsOwner ? (
                <EmptyHint text="Розкажіть іншим учасникам, чим ви займаєтесь." cta="Додати опис" onClick={() => setEditModalOpen(true)} />
              ) : (
                <p className="text-[13.5px] text-ink-tertiary">Опис ще не додано.</p>
              )}
              {viewerIsOwner && !current.is_approved ? (
                <div className="mt-5 rounded-lg border border-gold/25 bg-gold/10 px-4 py-3">
                  <p className="text-[12.5px] text-gold-soft">Ваш профіль ще очікує підтвердження модератором закритої бета-версії.</p>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              title="Проєкти"
              icon={FolderKanban}
              action={
                viewerIsOwner ? (
                  <button
                    onClick={() => setCreateProjectOpen(true)}
                    className="flex items-center gap-1 text-[12px] font-medium text-purple-soft transition-colors hover:text-purple"
                  >
                    <Plus size={13} /> Додати
                  </button>
                ) : null
              }
            >
              {loadingSections ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                viewerIsOwner ? (
                  <EmptyHint text="Ще немає проєктів — додайте перший." cta="Додати проєкт" onClick={() => setCreateProjectOpen(true)} />
                ) : (
                  <p className="text-[13.5px] text-ink-tertiary">Проєктів поки немає.</p>
                )
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {projects.map((p) => (
                    <div key={p.id} className="glass rounded-xl border border-border-subtle p-4">
                      <h4 className="text-[13.5px] font-semibold text-ink-primary">{p.title}</h4>
                      {p.description ? (
                        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-secondary">{p.description}</p>
                      ) : null}
                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                            p.status === "active" ? "bg-blue/10 text-blue" : "bg-success/10 text-success"
                          }`}
                        >
                          {p.status === "active" ? "Будується" : "Завершено"}
                        </span>
                        {p.team_size ? <span className="text-[11px] text-ink-tertiary">Команда: {p.team_size}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="flex flex-col gap-4">
            <SectionCard title="Навички">
              {current.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {current.skills.map((s) => (
                    <Chip key={s}>{s}</Chip>
                  ))}
                </div>
              ) : viewerIsOwner ? (
                <EmptyHint text="Додайте навички, щоб вас легше було знайти." cta="Додати" onClick={() => setEditModalOpen(true)} />
              ) : (
                <p className="text-[12.5px] text-ink-tertiary">Не вказано.</p>
              )}
            </SectionCard>

            <SectionCard title="Поточні цілі">
              {current.business_goals.length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {current.business_goals.map((g) => (
                    <li key={g} className="text-[13px] text-ink-primary">
                      {g}
                    </li>
                  ))}
                </ul>
              ) : viewerIsOwner ? (
                <EmptyHint text="Ще не додано жодної цілі." cta="Додати" onClick={() => setEditModalOpen(true)} />
              ) : (
                <p className="text-[12.5px] text-ink-tertiary">Не вказано.</p>
              )}
            </SectionCard>

            <SectionCard title="Кого шукаю">
              {current.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {current.interests.map((v) => (
                    <Chip key={v}>{v}</Chip>
                  ))}
                </div>
              ) : viewerIsOwner ? (
                <EmptyHint text="Ще не вказано." cta="Додати" onClick={() => setEditModalOpen(true)} />
              ) : (
                <p className="text-[12.5px] text-ink-tertiary">Не вказано.</p>
              )}
            </SectionCard>

            <SectionCard title="Чим можу допомогти">
              {current.industries.length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {current.industries.map((v) => (
                    <li key={v} className="text-[13px] text-ink-primary">
                      {v}
                    </li>
                  ))}
                </ul>
              ) : viewerIsOwner ? (
                <EmptyHint text="Ще не вказано." cta="Додати" onClick={() => setEditModalOpen(true)} />
              ) : (
                <p className="text-[12.5px] text-ink-tertiary">Не вказано.</p>
              )}
            </SectionCard>

            {viewerIsOwner ? (
              <div className="glass rounded-2xl border border-border-subtle p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Заповненість профілю</span>
                  <span className="font-display text-[13px] font-semibold text-ink-primary">{completeness}%</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-grad-purple-blue transition-all" style={{ width: `${completeness}%` }} />
                </div>
                <p className="mt-3 text-[11.5px] leading-relaxed text-ink-tertiary">
                  Заповнений профіль отримує більше уваги в Match-блоці та Feed.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {editModalOpen ? (
        <EditProfileModal
          profile={current}
          onClose={() => setEditModalOpen(false)}
          onSaved={(updated) => {
            setCurrent(updated);
            setEditModalOpen(false);
            router.refresh();
            // The completion-bonus trigger runs server-side on this same
            // update, so the new AX/level are already in place — just
            // re-fetch to reflect them without waiting for a remount.
            const supabase = createClient();
            getProfileStats(supabase, updated.id).then(setStats);
          }}
        />
      ) : null}

      {createProjectOpen ? (
        <CreateProjectModal
          userId={current.id}
          onClose={() => setCreateProjectOpen(false)}
          onCreated={() => {
            const supabase = createClient();
            getProjects(supabase, current.id).then(setProjects);
          }}
        />
      ) : null}

      {reviewModalOpen && viewerId ? (
        <ReviewModal
          reviewerId={viewerId}
          revieweeId={current.id}
          revieweeName={current.full_name}
          onClose={() => setReviewModalOpen(false)}
          onSubmitted={() => {
            setHasReviewed(true);
            const supabase = createClient();
            getProfileStats(supabase, current.id).then(setStats);
          }}
        />
      ) : null}

      {reportModalOpen && viewerId ? (
        <ReportModal
          reporterId={viewerId}
          reportedId={current.id}
          reportedName={current.full_name}
          onClose={() => setReportModalOpen(false)}
        />
      ) : null}

      {gamificationInfoOpen ? (
        <GamificationInfoModal levels={levels} onClose={() => setGamificationInfoOpen(false)} />
      ) : null}
    </div>
  );
}
