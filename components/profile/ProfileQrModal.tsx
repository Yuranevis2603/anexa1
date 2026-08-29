"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import ModalPortal from "@/components/ui/ModalPortal";
import QrCode from "@/components/ui/QrCode";

/** Sniff someone's phone camera at this and it opens their profile if
 * they're already an ANEXA member, or the registration flow (with this
 * member credited as the referrer) if they're not — see app/u/[code]/route.ts. */
export default function ProfileQrModal({ code, onClose }: { code: string; onClose: () => void }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/u/${code}`;
  const linkDisplay = `anexa.club/u/${code}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("error", "Не вдалося скопіювати посилання.");
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
          className="glass w-full max-w-sm rounded-t-2xl border border-border-subtle bg-base-card p-6 text-center sm:rounded-2xl"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-[16px] font-semibold text-ink-primary">Мій QR-код</h2>
            <button
              onClick={onClose}
              aria-label="Закрити"
              className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mx-auto flex w-fit items-center justify-center rounded-2xl border border-border-subtle bg-white p-3">
            <QrCode value={link} size={200} />
          </div>
          <p className="mt-3.5 text-[12.5px] text-ink-tertiary">
            Покажіть цей код — знайомі одразу перейдуть на ваш профіль, а нові люди потраплять на реєстрацію.
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border-strong bg-white/[0.03] px-3.5 py-2.5">
            <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-primary">{linkDisplay}</span>
            <button
              type="button"
              onClick={copyLink}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 ${
                copied ? "bg-success" : "bg-grad-purple-blue"
              }`}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Скопійовано" : "Копіювати"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
