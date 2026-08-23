"use client";

import { useState } from "react";
import { Check, Copy, Download, Gift, GitBranch, Image as ImageIcon, Link2, MessageCircle, Send, Zap } from "lucide-react";
import { computeLevelProgress, type Level, type ProfileStats } from "@/lib/gamification";
import { bucketReferralsByWeek, type Referral } from "@/lib/invites";
import type { Profile } from "@/lib/profile";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";
import ProfilePreviewCard from "@/components/profile/ProfilePreviewCard";

const DEFAULT_INVITE_TEXT =
  "Привіт! Я в ANEXA — приватній спільноті власників бізнесу. Думаю, тобі буде корисно. Ось моє запрошення:";

const CREATIVE_TEMPLATES: { id: "purple" | "gold" | "minimal"; label: string }[] = [
  { id: "purple", label: "Фіолетовий" },
  { id: "gold", label: "Золотий" },
  { id: "minimal", label: "Мінімалізм" },
];

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

export default function InviteFriendView({
  profile,
  stats,
  levels,
  referrals,
  secondLevelCount,
  axFromReferrals,
  referralAx,
}: {
  profile: Profile;
  stats: ProfileStats;
  levels: Level[];
  referrals: Referral[];
  secondLevelCount: number;
  axFromReferrals: number;
  referralAx: number;
}) {
  const { showToast } = useToast();
  const [inviteText, setInviteText] = useState(DEFAULT_INVITE_TEXT);
  const [editingText, setEditingText] = useState(false);
  const [copied, setCopied] = useState(false);

  const code = profile.referral_code;
  const link = code && typeof window !== "undefined" ? `${window.location.origin}/register?invite=${code}` : "";
  const linkDisplay = code ? `anexa.club/register?invite=${code}` : "—";

  const levelProgress = computeLevelProgress(stats.ax_points, levels);
  const weeks = bucketReferralsByWeek(referrals, 10);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count));

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("error", "Не вдалося скопіювати посилання.");
    }
  }

  const shareMessage = `${inviteText}\n${link}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(inviteText)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const qrSrc = link ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(link)}` : "";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-2">
        <Gift size={20} className="text-purple-soft" />
        <h1 className="font-display text-lg font-semibold text-ink-primary sm:text-xl">Запросити друга</h1>
      </div>
      <p className="mt-1.5 text-[13px] text-ink-secondary">
        Без лімітів — одним посиланням можна поділитися з ким завгодно. За кожного, хто приєднається, — +{referralAx} AX.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="glass relative overflow-hidden rounded-2xl border border-border-subtle p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Твоє реферальне посилання</p>
          <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-xl border border-border-strong bg-white/[0.03] px-3.5 py-3">
            <Link2 size={16} className="shrink-0 text-purple-soft" />
            <span className="min-w-0 flex-1 truncate font-mono text-[13.5px] text-ink-primary">{linkDisplay}</span>
            <button
              type="button"
              onClick={copyLink}
              disabled={!code}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${
                copied ? "bg-success" : "bg-grad-purple-blue shadow-glow-purple"
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Скопійовано" : "Копіювати"}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Текст запрошення</p>
            <button
              type="button"
              onClick={() => setEditingText((v) => !v)}
              className="text-[11.5px] text-purple-soft hover:underline"
            >
              {editingText ? "Готово" : "Редагувати"}
            </button>
          </div>
          {editingText ? (
            <textarea
              value={inviteText}
              onChange={(e) => setInviteText(e.target.value)}
              rows={3}
              className="mt-2.5 w-full resize-y rounded-xl border border-border-subtle bg-white/[0.03] px-3.5 py-3 text-[13px] leading-relaxed text-ink-primary focus:outline-none"
            />
          ) : (
            <p className="mt-2.5 rounded-xl border border-border-subtle bg-white/[0.03] px-3.5 py-3 text-[13px] leading-relaxed text-ink-primary">
              {inviteText}
            </p>
          )}

          <div className="mt-3.5 flex flex-wrap gap-2.5">
            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl bg-grad-purple-blue px-4 py-2.5 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
            >
              <Send size={15} />
              Telegram
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl border border-border-subtle bg-white/[0.03] px-4 py-2.5 text-[12.5px] font-medium text-ink-primary transition-colors hover:bg-white/[0.06]"
            >
              <MessageCircle size={15} className="text-success" />
              WhatsApp
            </a>
            {qrSrc ? (
              <img
                src={qrSrc}
                alt="QR-код посилання-запрошення"
                width={44}
                height={44}
                className="shrink-0 rounded-xl border border-border-subtle bg-white p-1"
              />
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="glass rounded-2xl border border-border-subtle p-5">
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-blue" />
              <p className="text-[13px] font-semibold text-ink-primary">
                Рівень {levelProgress.level} · {levelProgress.title}
              </p>
            </div>
            <p className="font-display mt-3.5 text-[26px] font-semibold leading-none text-ink-primary">
              {stats.ax_balance.toLocaleString("uk-UA")} <span className="text-[13px] font-medium text-ink-tertiary">AX</span>
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-grad-purple-blue" style={{ width: `${levelProgress.progressPercent}%` }} />
            </div>
            {levelProgress.nextLevelAx !== null ? (
              <p className="mt-2 text-[11.5px] text-ink-tertiary">{levelProgress.nextLevelAx - stats.ax_points} AX до наступного рівня</p>
            ) : null}
            <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3.5">
              <p className="text-[12.5px] text-ink-secondary">Зароблено на запрошеннях</p>
              <p className="text-[13px] font-semibold text-success">+{axFromReferrals.toLocaleString("uk-UA")} AX</p>
            </div>
          </div>

          <div className="glass rounded-2xl border border-border-subtle p-4">
            <p className="text-[12.5px] font-semibold text-ink-primary">Що бачить друг</p>
            <div className="mt-3 rounded-xl border border-border-subtle bg-base-surface px-4 py-4.5 text-center">
              <Avatar
                src={profile.avatar_url}
                name={profile.full_name}
                size={44}
                className="relative mx-auto flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[14px] font-semibold text-white"
              />
              <p className="mt-2.5 text-[13px] font-medium text-ink-primary">{profile.full_name} запрошує тебе в ANEXA</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-tertiary">
                Приватна бізнес-спільнота. Вхід лише за запрошенням.
              </p>
              <div className="mt-3 rounded-xl bg-grad-purple-blue px-3 py-2.5 text-[12px] font-medium text-white">
                Прийняти запрошення
              </div>
            </div>
          </div>
        </div>
      </div>

      {code ? (
        <div className="glass mt-4 rounded-2xl border border-border-subtle p-5">
          <div className="flex items-center gap-2">
            <ImageIcon size={15} className="text-purple-soft" />
            <p className="text-[13px] font-semibold text-ink-primary">Готові креативи для посилання</p>
          </div>
          <p className="mt-1 text-[12px] text-ink-secondary">
            Картки з твоїм ім&rsquo;ям, фото і QR-кодом — готові для сторіс і постів у соцмережах.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {CREATIVE_TEMPLATES.map((t) => (
              <div
                key={t.id}
                className="flex flex-col items-center gap-2.5 rounded-xl border border-border-subtle bg-white/[0.02] p-3"
              >
                <img
                  src={`/api/invite-creative/${t.id}`}
                  alt={`Креатив «${t.label}»`}
                  loading="lazy"
                  className="aspect-square w-full rounded-lg border border-border-subtle object-cover"
                />
                <p className="text-[12px] text-ink-secondary">{t.label}</p>
                <a
                  href={`/api/invite-creative/${t.id}`}
                  download={`anexa-invite-${t.id}.png`}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[12px] font-medium text-ink-primary transition-colors hover:bg-white/[0.06]"
                >
                  <Download size={13} />
                  Завантажити
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="glass rounded-2xl border border-border-subtle p-4">
          <p className="text-[12px] text-ink-tertiary">Приєдналися</p>
          <p className="font-display mt-1.5 text-[24px] font-semibold text-ink-primary">{referrals.length}</p>
        </div>
        <div className="glass rounded-2xl border border-border-subtle p-4">
          <p className="text-[12px] text-ink-tertiary">2-й рівень мережі</p>
          <p className="font-display mt-1.5 text-[24px] font-semibold text-ink-primary">{secondLevelCount}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div className="glass rounded-2xl border border-border-subtle p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-semibold text-ink-primary">Запрошення у часі</p>
            <p className="text-[11.5px] text-ink-tertiary">останні 10 тижнів</p>
          </div>
          {referrals.length === 0 ? (
            <p className="mt-6 py-10 text-center text-[13px] text-ink-tertiary">Поки що ніхто не приєднався.</p>
          ) : (
            <div className="mt-5 flex h-[130px] items-end gap-2">
              {weeks.map((w, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t bg-grad-purple-blue"
                    style={{ height: `${Math.max(3, Math.round((w.count / maxWeek) * 110))}px` }}
                    title={`${w.count}`}
                  />
                  <span className="text-[10px] text-ink-tertiary">{w.label}</span>
                </div>
              ))}
            </div>
          )}

          {secondLevelCount > 0 ? (
            <div className="mt-4 flex items-center gap-3.5 border-t border-border-subtle pt-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple/[0.12] text-purple-soft">
                <GitBranch size={16} />
              </div>
              <div>
                <p className="text-[12.5px] font-medium text-ink-primary">Твої запрошені привели ще {secondLevelCount}</p>
                <p className="text-[11.5px] text-ink-tertiary">2-й рівень мережі</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="glass rounded-2xl border border-border-subtle p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-semibold text-ink-primary">Запрошені</p>
            <p className="text-[11.5px] text-ink-tertiary">{referrals.length} усього</p>
          </div>
          {referrals.length === 0 ? (
            <p className="mt-6 py-10 text-center text-[13px] text-ink-tertiary">Ще ніхто не приєднався за вашим посиланням.</p>
          ) : (
            <div className="mt-2 flex flex-col">
              {referrals.map((r) => (
                <ProfilePreviewCard key={r.userId} userId={r.userId}>
                  <div className="flex items-center gap-3 border-b border-border-subtle py-2.5 last:border-0">
                    <Avatar
                      src={r.avatarUrl}
                      name={r.fullName}
                      size={34}
                      className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[11.5px] font-semibold text-white"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink-primary hover:underline">{r.fullName}</p>
                      <p className="truncate text-[11.5px] text-ink-tertiary">{timeAgo(r.joinedAt)}</p>
                    </div>
                    <span className="shrink-0 text-[12px] font-semibold text-success">+{referralAx} AX</span>
                  </div>
                </ProfilePreviewCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
