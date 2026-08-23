"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  archiveCommunity,
  deleteCommunity,
  regenerateInviteCode,
  updateCommunityAccess,
  updateCommunityProfile,
  updateCommunitySettings,
  type Community,
  type CommunityAccess,
  type CommunitySettings,
} from "@/lib/communities";
import { useToast } from "@/components/ui/ToastProvider";

const CATEGORIES = ["Засновники", "Інвестиції", "Продукт", "Дизайн", "Менторство"];

const ACCESS_DEFS: { key: CommunityAccess; label: string; hint: string }[] = [
  { key: "public", label: "Публічна", hint: "Будь-хто бачить контент і приєднується одним кліком." },
  { key: "request", label: "За заявкою", hint: "Контент видно, вступ — після схвалення адміністратором." },
  { key: "private", label: "Приватна", hint: "Спільнота прихована, вступ лише за персональним запрошенням." },
];

const TOGGLE_DEFS: { key: keyof CommunitySettings; label: string; hint: string }[] = [
  { key: "approve", label: "Схвалювати заявки вручну", hint: "Кожен новий учасник проходить через чергу адміністратора." },
  { key: "moderatePosts", label: "Премодерація постів", hint: "Пости зʼявляються у стрічці лише після перевірки." },
  { key: "memberEvents", label: "Учасники можуть створювати події", hint: "Без премодерації, але з позначкою автора." },
  { key: "digest", label: "Щотижневий дайджест", hint: "Автоматичний лист із головними обговореннями тижня." },
];

export default function SettingsSection({ community }: { community: Community }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description ?? "");
  const [category, setCategory] = useState(community.category ?? CATEGORIES[0]);
  const [access, setAccess] = useState<CommunityAccess>(community.access);
  const [inviteCode, setInviteCode] = useState(community.inviteCode ?? "");
  const [settings, setSettings] = useState<CommunitySettings>(community.settings);
  const [copied, setCopied] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await updateCommunityProfile(createClient(), community.id, { name, description, category });
      showToast("success", "Збережено.");
    } catch (err) {
      showToast("error", "Не вдалося зберегти зміни.");
      console.error("saveProfile failed:", err);
    } finally {
      setSavingProfile(false);
    }
  }

  async function changeAccess(next: CommunityAccess) {
    const prev = access;
    setAccess(next);
    try {
      await updateCommunityAccess(createClient(), community.id, next);
    } catch (err) {
      setAccess(prev);
      showToast("error", "Не вдалося змінити доступ.");
      console.error("changeAccess failed:", err);
    }
  }

  function copyInvite() {
    navigator.clipboard.writeText(`${window.location.origin}/dashboard/communities/join/${inviteCode}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function regenerate() {
    try {
      const code = await regenerateInviteCode(createClient(), community.id);
      setInviteCode(code);
    } catch (err) {
      showToast("error", "Не вдалося оновити посилання.");
      console.error("regenerateInviteCode failed:", err);
    }
  }

  async function toggleFlag(key: keyof CommunitySettings) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await updateCommunitySettings(createClient(), community.id, next);
    } catch (err) {
      setSettings(settings);
      showToast("error", "Не вдалося зберегти.");
      console.error("updateCommunitySettings failed:", err);
    }
  }

  async function archive() {
    if (!window.confirm("Архівувати спільноту? Публікації та вступ буде закрито, історія збережеться.")) return;
    try {
      await archiveCommunity(createClient(), community.id);
      showToast("success", "Спільноту архівовано.");
    } catch (err) {
      showToast("error", "Не вдалося архівувати спільноту.");
      console.error("archiveCommunity failed:", err);
    }
  }

  async function remove() {
    if (!window.confirm(`Видалити спільноту «${community.name}» безповоротно?`)) return;
    setDeleting(true);
    try {
      await deleteCommunity(createClient(), community.id);
      showToast("success", "Спільноту видалено.");
      router.push("/dashboard/communities");
    } catch (err) {
      showToast(
        "error",
        "Не вдалося видалити — у спільноті ще є пости, обговорення чи події. Спробуйте архівувати замість цього."
      );
      console.error("deleteCommunity failed:", err);
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border-subtle bg-white/[0.028] p-6">
        <p className="text-[15px] font-semibold text-ink-primary">Основне</p>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">Назва спільноти</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-white/[0.03] px-3.5 py-2.5 text-[13.5px] text-ink-primary focus:border-purple/50 focus:outline-none"
            />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">Опис</p>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-y rounded-xl border border-border-subtle bg-white/[0.03] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink-primary focus:border-purple/50 focus:outline-none"
            />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">Категорія</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-lg border px-3.5 py-2 text-[12.5px] font-medium transition-colors ${
                    category === c
                      ? "border-purple/45 bg-purple/[0.18] text-purple-soft"
                      : "border-border-subtle bg-white/[0.03] text-ink-tertiary hover:text-ink-primary"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={saveProfile}
            disabled={savingProfile}
            className="flex w-fit items-center gap-2 rounded-xl bg-grad-purple-blue px-4 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {savingProfile ? <Loader2 size={14} className="animate-spin" /> : null}
            Зберегти
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-white/[0.028] p-6">
        <p className="text-[15px] font-semibold text-ink-primary">Доступ</p>
        <div className="mt-4 flex flex-col gap-2">
          {ACCESS_DEFS.map((a) => {
            const on = access === a.key;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => changeAccess(a.key)}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                  on ? "border-purple/40 bg-purple/[0.1]" : "border-border-subtle bg-white/[0.03]"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
                    on ? "border-purple-soft" : "border-white/20"
                  }`}
                >
                  {on ? <span className="h-2 w-2 rounded-full bg-purple-soft" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-ink-primary">{a.label}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-tertiary">{a.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        {access !== "public" ? (
          <div className="mt-4 border-t border-border-subtle pt-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">Посилання-запрошення</p>
            <p className="mb-2.5 text-[12.5px] leading-relaxed text-ink-tertiary">
              {access === "private"
                ? "Єдиний спосіб приєднатися до приватної спільноти. Надсилайте персонально."
                : "Відкриває форму заявки одразу, минаючи пошук у каталозі."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-border-subtle bg-white/[0.03] px-3.5 py-2.5">
                <Link2 size={14} className="shrink-0 text-ink-tertiary" />
                <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-ink-secondary">
                  anexa.club/c/{community.id.slice(0, 8)}/join/{inviteCode}
                </span>
              </div>
              <button
                type="button"
                onClick={copyInvite}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 ${
                  copied ? "bg-success" : "bg-grad-purple-blue"
                }`}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Скопійовано" : "Скопіювати"}
              </button>
              <button
                type="button"
                onClick={regenerate}
                className="rounded-xl border border-border-subtle bg-white/[0.04] px-4 py-2.5 text-[12.5px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.09] hover:text-ink-primary"
              >
                Оновити
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border-subtle bg-white/[0.028] p-6">
        <p className="text-[15px] font-semibold text-ink-primary">Правила публікацій</p>
        <div className="mt-3 flex flex-col">
          {TOGGLE_DEFS.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-4 border-b border-white/[0.05] py-3.5 last:border-0">
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-ink-primary">{t.label}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-tertiary">{t.hint}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleFlag(t.key)}
                className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ${
                  settings[t.key] ? "bg-grad-purple-blue" : "bg-white/[0.1]"
                }`}
              >
                <span
                  className="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-md transition-all"
                  style={{ left: settings[t.key] ? "23px" : "3px" }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-danger/20 bg-danger/[0.05] p-6">
        <p className="text-[15px] font-semibold text-danger">Небезпечна зона</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-md text-[12.5px] leading-relaxed text-ink-secondary">
            Архівування закриває публікації та вступ, але зберігає історію. Видалення можливе лише для порожньої спільноти
            (без постів, обговорень чи подій).
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={archive}
              className="rounded-lg border border-border-subtle bg-white/[0.05] px-3.5 py-2 text-[12.5px] font-medium text-ink-primary transition-colors hover:bg-white/[0.1]"
            >
              Архівувати
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="rounded-lg border border-danger/35 bg-danger/[0.14] px-3.5 py-2 text-[12.5px] font-medium text-danger transition-colors hover:bg-danger/[0.24] disabled:opacity-60"
            >
              Видалити спільноту
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
