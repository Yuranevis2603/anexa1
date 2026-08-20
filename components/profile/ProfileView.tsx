"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  X,
  Loader2,
  CheckCircle2,
  Circle,
  MessageCircle,
  UserPlus,
  UserCheck,
  Check,
  Handshake,
  Plus,
  Trash2,
  ExternalLink,
  Users2,
  FolderKanban,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { initials, parseTagInput, profileCompleteness, type Profile } from "@/lib/profile";
import { getOrCreateConversation } from "@/lib/messages";
import { requestConnection } from "@/lib/connections";
import { getFollowCounts, isFollowing as fetchIsFollowing, toggleFollow, type FollowCounts } from "@/lib/follows";
import { deleteProject, getUserProjects, projectStatusLabel, type Project } from "@/lib/projects";
import { getUserActivityPage, getUserLikes, getUserSaves, type FeedItem } from "@/lib/feed";
import { useToast } from "@/components/ui/ToastProvider";
import AddProjectModal from "@/components/profile/AddProjectModal";
import PostCard from "@/components/feed/PostCard";

type EditableFields = {
  full_name: string;
  role_title: string;
  company: string;
  avatar_url: string;
  bio: string;
  username: string;
  location: string;
  skills: string;
  interests: string;
  business_goals: string;
  industries: string;
};

function toEditable(profile: Profile): EditableFields {
  return {
    full_name: profile.full_name ?? "",
    role_title: profile.role_title ?? "",
    company: profile.company ?? "",
    avatar_url: profile.avatar_url ?? "",
    bio: profile.bio ?? "",
    username: profile.username ?? "",
    location: profile.location ?? "",
    skills: (profile.skills ?? []).join(", "),
    interests: (profile.interests ?? []).join(", "),
    business_goals: (profile.business_goals ?? []).join(", "),
    industries: (profile.industries ?? []).join(", "),
  };
}

export default function ProfileView({
  profile,
  email,
  viewerIsOwner = true,
  viewerId,
}: {
  profile: Profile;
  email?: string;
  viewerIsOwner?: boolean;
  viewerId?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [current, setCurrent] = useState(profile);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<EditableFields>(toEditable(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [connectSent, setConnectSent] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [following, setFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null);

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [confirmingProjectId, setConfirmingProjectId] = useState<string | null>(null);

  const [activity, setActivity] = useState<FeedItem[] | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const completeness = profileCompleteness(current);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    getUserProjects(supabase, current.id).then((rows) => {
      if (!cancelled) setProjects(rows);
    });

    getUserActivityPage(supabase, { userId: current.id, pageSize: 5 }).then(async ({ items }) => {
      if (cancelled) return;
      setActivity(items);
      if (viewerId && items.length > 0) {
        const ids = items.map((item) => item.id);
        const [liked, saved] = await Promise.all([
          getUserLikes(supabase, viewerId, ids),
          getUserSaves(supabase, viewerId, ids),
        ]);
        if (!cancelled) {
          setLikedIds(liked);
          setSavedIds(saved);
        }
      }
    });

    getFollowCounts(supabase, current.id).then((counts) => {
      if (!cancelled) setFollowCounts(counts);
    });

    if (!viewerIsOwner && viewerId) {
      fetchIsFollowing(supabase, viewerId, current.id).then((state) => {
        if (!cancelled) setFollowing(state);
      });
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id, viewerIsOwner, viewerId]);

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

  async function handleConnect() {
    if (!viewerId || connecting || connectSent) return;
    setConnecting(true);
    try {
      const supabase = createClient();
      await requestConnection(supabase, viewerId, current.id);
      setConnectSent(true);
      showToast("success", `Запит на знайомство надіслано ${current.full_name}.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося надіслати запит.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleToggleFollow() {
    if (!viewerId || followPending) return;
    setFollowPending(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setFollowCounts((c) =>
      c ? { ...c, followers: c.followers + (wasFollowing ? -1 : 1) } : c
    );

    try {
      const supabase = createClient();
      await toggleFollow(supabase, viewerId, current.id, wasFollowing);
    } catch (err) {
      setFollowing(wasFollowing);
      setFollowCounts((c) =>
        c ? { ...c, followers: c.followers + (wasFollowing ? 1 : -1) } : c
      );
      showToast("error", "Не вдалося оновити підписку.");
      console.error("toggleFollow failed:", err);
    } finally {
      setFollowPending(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    if (deletingProjectId) return;
    setDeletingProjectId(projectId);
    try {
      const supabase = createClient();
      await deleteProject(supabase, projectId);
      setProjects((prev) => (prev ? prev.filter((p) => p.id !== projectId) : prev));
      showToast("success", "Проєкт видалено.");
    } catch (err) {
      showToast("error", "Не вдалося видалити проєкт.");
      console.error("deleteProject failed:", err);
    } finally {
      setDeletingProjectId(null);
      setConfirmingProjectId(null);
    }
  }

  function openModal() {
    setForm(toEditable(current));
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError("Повне ім'я обов'язкове.");
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      full_name: form.full_name.trim(),
      role_title: form.role_title.trim() || null,
      company: form.company.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      bio: form.bio.trim() || null,
      username: form.username.trim() || null,
      location: form.location.trim() || null,
      skills: parseTagInput(form.skills),
      interests: parseTagInput(form.interests),
      business_goals: parseTagInput(form.business_goals),
      industries: parseTagInput(form.industries),
      updated_at: new Date().toISOString(),
    };

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", current.id)
      .select()
      .single();

    setSaving(false);

    if (updateError) {
      setError(
        updateError.code === "23505"
          ? "Це ім'я користувача вже зайняте."
          : "Не вдалося зберегти профіль. Спробуйте ще раз."
      );
      return;
    }

    setCurrent(data as Profile);
    setModalOpen(false);
    router.refresh(); // keeps Header (name/avatar) in sync
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Profile header card */}
      <section className="glass overflow-hidden rounded-2xl border border-border-subtle">
        <div
          className="h-28 bg-grad-purple-blue bg-cover bg-center"
          style={current.cover_url ? { backgroundImage: `url(${current.cover_url})` } : undefined}
        />

        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-base-card bg-white/10 text-2xl font-semibold text-ink-primary">
              {current.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.avatar_url}
                  alt={current.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(current.full_name)
              )}
            </div>

            {viewerIsOwner ? (
              <button
                onClick={openModal}
                className="flex items-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
              >
                <Pencil size={14} />
                Редагувати профіль
              </button>
            ) : viewerId ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleMessage}
                  disabled={startingChat}
                  className="flex items-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {startingChat ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                  Написати
                </button>
                <button
                  onClick={handleConnect}
                  disabled={connecting || connectSent}
                  className="flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-2 text-[13px] font-medium text-ink-primary transition-colors hover:bg-white/[0.06] disabled:opacity-60"
                >
                  {connecting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : connectSent ? (
                    <Check size={14} />
                  ) : (
                    <Handshake size={14} />
                  )}
                  {connectSent ? "Запит надіслано" : "Познайомитися"}
                </button>
                <button
                  onClick={handleToggleFollow}
                  disabled={followPending}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-60 ${
                    following
                      ? "bg-white/[0.06] text-ink-primary"
                      : "border border-border-subtle text-ink-primary hover:bg-white/[0.06]"
                  }`}
                >
                  {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                  {following ? "Підписані" : "Підписатися"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                {current.full_name}
              </h1>
              {current.membership_tier === "black" ? (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-secondary">
                  Black
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[13.5px] text-ink-secondary">
              {current.username ? `@${current.username} · ` : ""}
              {[current.role_title, current.company].filter(Boolean).join(" · ") ||
                "Посада та компанія ще не вказані"}
            </p>
            {current.location ? (
              <p className="mt-1 text-[12px] text-ink-tertiary">{current.location}</p>
            ) : null}
            {viewerIsOwner && email ? (
              <p className="mt-1 text-[12px] text-ink-tertiary">{email}</p>
            ) : null}

            {followCounts ? (
              <div className="mt-3 flex items-center gap-4 text-[12.5px] text-ink-secondary">
                <span>
                  <span className="font-semibold text-ink-primary">{followCounts.followers}</span> підписників
                </span>
                <span>
                  <span className="font-semibold text-ink-primary">{followCounts.following}</span> підписок
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-6 md:col-span-2">
          {/* About */}
          <section className="glass rounded-2xl border border-border-subtle p-6">
            <h2 className="font-display text-[15px] font-semibold text-ink-primary">
              Про мене
            </h2>
            {current.bio ? (
              <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-secondary">
                {current.bio}
              </p>
            ) : (
              <p className="mt-3 text-[13.5px] text-ink-tertiary">
                Розкажіть іншим учасникам, чим ви займаєтесь — натисніть
                «Редагувати профіль».
              </p>
            )}

            {viewerIsOwner && !current.is_approved && (
              <div className="mt-5 rounded-lg border border-gold/25 bg-gold/10 px-4 py-3">
                <p className="text-[12.5px] text-gold-soft">
                  Ваш профіль ще очікує підтвердження модератором закритої
                  бета-версії.
                </p>
              </div>
            )}
          </section>

          {/* Projects */}
          <section className="glass rounded-2xl border border-border-subtle p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink-primary">
                <FolderKanban size={15} className="text-ink-tertiary" />
                Проєкти
              </h2>
              {viewerIsOwner ? (
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(true)}
                  className="flex items-center gap-1.5 text-[12.5px] font-medium text-purple-soft transition-colors hover:text-purple"
                >
                  <Plus size={14} />
                  Додати проєкт
                </button>
              ) : null}
            </div>

            {projects === null ? (
              <div className="mt-4 flex items-center gap-2 text-[12.5px] text-ink-tertiary">
                <Loader2 size={14} className="animate-spin" />
                Завантаження...
              </div>
            ) : projects.length === 0 ? (
              <p className="mt-3 text-[13.5px] text-ink-tertiary">
                {viewerIsOwner
                  ? "Ще немає жодного проєкту — додайте перший."
                  : "Учасник ще не додав жодного проєкту."}
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {projects.map((project) => (
                  <div key={project.id} className="rounded-xl border border-border-subtle bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[13.5px] font-semibold text-ink-primary">{project.title}</h3>
                      {viewerIsOwner ? (
                        <button
                          type="button"
                          onClick={() =>
                            confirmingProjectId === project.id
                              ? handleDeleteProject(project.id)
                              : setConfirmingProjectId(project.id)
                          }
                          disabled={deletingProjectId === project.id}
                          aria-label="Видалити проєкт"
                          className={`shrink-0 rounded-md p-1 transition-colors ${
                            confirmingProjectId === project.id
                              ? "text-danger"
                              : "text-ink-tertiary hover:text-danger"
                          }`}
                        >
                          {deletingProjectId === project.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      ) : null}
                    </div>
                    {project.description ? (
                      <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-ink-secondary">
                        {project.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                          project.status === "completed"
                            ? "bg-success/10 text-success"
                            : "bg-blue/10 text-blue-soft"
                        }`}
                      >
                        {projectStatusLabel(project.status)}
                      </span>
                      {project.team_size ? (
                        <span className="flex items-center gap-1 text-[11px] text-ink-tertiary">
                          <Users2 size={11} />
                          {project.team_size}
                        </span>
                      ) : null}
                      {project.link_url ? (
                        <a
                          href={project.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1 text-[11px] text-purple-soft hover:text-purple"
                        >
                          <ExternalLink size={11} />
                          Посилання
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent activity */}
          {activity === null ? (
            <section className="glass rounded-2xl border border-border-subtle p-6">
              <div className="flex items-center gap-2 text-[12.5px] text-ink-tertiary">
                <Loader2 size={14} className="animate-spin" />
                Завантаження...
              </div>
            </section>
          ) : activity.length > 0 && viewerId ? (
            <section className="glass rounded-2xl border border-border-subtle p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-[15px] font-semibold text-ink-primary">
                <Sparkles size={15} className="text-ink-tertiary" />
                Останні публікації
              </h2>
              <div className="flex flex-col gap-3">
                {activity.map((item) => (
                  <PostCard
                    key={item.id}
                    item={item}
                    userId={viewerId}
                    initiallyLiked={likedIds.has(item.id)}
                    initiallySaved={savedIds.has(item.id)}
                    onDeleted={(id) =>
                      setActivity((prev) => (prev ? prev.filter((a) => a.id !== id) : prev))
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          {/* Skills / interests / goals */}
          <TagSection title="Навички" tags={current.skills} />
          <TagSection title="Інтереси" tags={current.interests} />
          <TagSection title="Цілі" tags={current.business_goals} />
          <TagSection title="Галузі" tags={current.industries} />

          {/* Completeness */}
          <aside className="glass h-fit rounded-2xl border border-border-subtle p-6">
            <h3 className="text-[13px] font-medium text-ink-primary">
              Заповненість профілю
            </h3>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-semibold text-ink-primary">
                {completeness}%
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-grad-purple-blue transition-all"
                style={{ width: `${completeness}%` }}
              />
            </div>

            <ul className="mt-4 flex flex-col gap-2">
              {(
                [
                  ["full_name", "Повне ім'я"],
                  ["role_title", "Посада"],
                  ["company", "Компанія"],
                  ["avatar_url", "Фото профілю"],
                  ["bio", "Про мене"],
                  ["location", "Локація"],
                  ["skills", "Навички"],
                ] as [keyof Profile, string][]
              ).map(([field, label]) => {
                const value = current[field];
                const done = Array.isArray(value)
                  ? value.length > 0
                  : typeof value === "string" && value.trim().length > 0;
                return (
                  <li
                    key={field}
                    className="flex items-center gap-2 text-[12.5px] text-ink-secondary"
                  >
                    {done ? (
                      <CheckCircle2 size={14} className="shrink-0 text-success" />
                    ) : (
                      <Circle size={14} className="shrink-0 text-ink-tertiary" />
                    )}
                    {label}
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </div>

      {/* Edit modal */}
      {viewerIsOwner && modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="glass max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-subtle bg-base-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-[16px] font-semibold text-ink-primary">
                Редагувати профіль
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Закрити"
                className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <Field
                label="Повне ім'я *"
                value={form.full_name}
                onChange={(v) => setForm({ ...form, full_name: v })}
                required
              />
              <Field
                label="Ім'я користувача"
                value={form.username}
                onChange={(v) => setForm({ ...form, username: v })}
                placeholder="напр. yura.oliinyk"
              />
              <Field
                label="Посада"
                value={form.role_title}
                onChange={(v) => setForm({ ...form, role_title: v })}
                placeholder="напр. Співвласник"
              />
              <Field
                label="Компанія"
                value={form.company}
                onChange={(v) => setForm({ ...form, company: v })}
                placeholder="напр. Lumen Studio"
              />
              <Field
                label="Локація"
                value={form.location}
                onChange={(v) => setForm({ ...form, location: v })}
                placeholder="напр. Vienna, Austria"
              />
              <Field
                label="URL фото профілю"
                value={form.avatar_url}
                onChange={(v) => setForm({ ...form, avatar_url: v })}
                placeholder="https://..."
                type="url"
              />
              <Field
                label="Навички (через кому)"
                value={form.skills}
                onChange={(v) => setForm({ ...form, skills: v })}
                placeholder="AI, Marketing, CRM"
              />
              <Field
                label="Інтереси (через кому)"
                value={form.interests}
                onChange={(v) => setForm({ ...form, interests: v })}
                placeholder="SaaS, Automation"
              />
              <Field
                label="Цілі (через кому)"
                value={form.business_goals}
                onChange={(v) => setForm({ ...form, business_goals: v })}
                placeholder="Знайти співзасновника, Запустити SaaS"
              />
              <Field
                label="Галузі (через кому)"
                value={form.industries}
                onChange={(v) => setForm({ ...form, industries: v })}
                placeholder="AI, Ecommerce"
              />
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">
                  Про мене
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
                  placeholder="Кілька речень про вас та ваш бізнес"
                />
              </div>

              {error && (
                <p className="text-[12.5px] text-danger">{error}</p>
              )}

              <div className="mt-1 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Зберегти профіль
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewerIsOwner ? (
        <AddProjectModal
          userId={current.id}
          open={projectModalOpen}
          onClose={() => setProjectModalOpen(false)}
          onCreated={(project) => setProjects((prev) => [project, ...(prev ?? [])])}
        />
      ) : null}
    </div>
  );
}

function TagSection({ title, tags }: { title: string; tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <section className="glass rounded-2xl border border-border-subtle p-6">
      <h3 className="text-[13px] font-medium text-ink-primary">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-border-subtle bg-white/[0.03] px-2.5 py-1 text-[12px] text-ink-secondary"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">
        {label}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
      />
    </div>
  );
}
