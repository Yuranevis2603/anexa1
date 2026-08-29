"use client";

import { useState } from "react";
import { Check, Copy, QrCode, Send, Share2, X } from "lucide-react";
import type { Profile } from "@/lib/profile";
import { useToast } from "@/components/ui/ToastProvider";
import ModalPortal from "@/components/ui/ModalPortal";
import AnexaQR from "./AnexaQR";

type Tab = "profile" | "invite";

export default function MyQRModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("profile");
  const [copied, setCopied] = useState(false);

  const profileUrl = `https://anexa.club/dashboard/people/${profile.id}`;
  const inviteUrl = profile.referral_code ? `https://anexa.club/register?invite=${profile.referral_code}` : profileUrl;

  const value = tab === "profile" ? profileUrl : inviteUrl;
  const display =
    tab === "profile"
      ? `anexa.club/dashboard/people/${profile.id}`
      : profile.referral_code
        ? `anexa.club/register?invite=${profile.referral_code}`
        : `anexa.club/dashboard/people/${profile.id}`;

  const shareText =
    tab === "profile" ? `${profile.full_name} в ANEXA Club` : "Приєднуйся до ANEXA Club — приватної бізнес-спільноти:";
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(value)}&text=${encodeURIComponent(shareText)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("error", "Не вдалося скопіювати посилання.");
    }
  }

  async function handleShare() {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text: shareText, url: value });
        return;
      }
    } catch {
      return; // user cancelled the native share sheet
    }
    handleCopy();
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
          className="glass w-full max-w-sm rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode size={17} className="text-purple-soft" />
              <p className="text-[14px] font-semibold text-ink-primary">Мій QR</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити"
              className="rounded-lg p-1.5 text-ink-tertiary hover:bg-white/[0.06] hover:text-ink-primary"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 flex rounded-xl border border-border-subtle bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setTab("profile")}
              className={`flex-1 rounded-lg py-2 text-[12.5px] font-medium transition-colors ${
                tab === "profile" ? "bg-grad-purple-blue text-white shadow-glow-purple" : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              Профіль
            </button>
            <button
              type="button"
              onClick={() => setTab("invite")}
              className={`flex-1 rounded-lg py-2 text-[12.5px] font-medium transition-colors ${
                tab === "invite" ? "bg-grad-purple-blue text-white shadow-glow-purple" : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              Запрошення
            </button>
          </div>

          <div className="mt-5 flex items-center justify-center rounded-[22px] border border-border-strong bg-base-surface p-5">
            <AnexaQR value={value} size={220} logo />
          </div>

          <p className="mt-3 truncate text-center font-mono text-[12px] text-ink-tertiary">{display}</p>
          <p className="mt-1 text-center text-[11.5px] text-ink-tertiary">
            {tab === "profile" ? "Скануйте, щоб відкрити профіль" : "Скануйте, щоб зареєструватись за запрошенням"}
          </p>

          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[12.5px] font-medium transition-colors ${
                copied ? "bg-success text-white" : "border border-border-subtle text-ink-primary hover:bg-white/[0.06]"
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Скопійовано" : "Копіювати"}
            </button>
            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border-subtle px-4 py-2.5 text-[12.5px] font-medium text-ink-primary transition-colors hover:bg-white/[0.06]"
            >
              <Send size={14} /> Telegram
            </a>
            <button
              type="button"
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-grad-purple-blue px-4 py-2.5 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
            >
              <Share2 size={14} /> Поділитися
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
