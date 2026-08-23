"use client";

import { useState } from "react";
import { Check, Copy, Gift, Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createInviteCode, getMyInvites, type InviteCode } from "@/lib/invites";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";
import ProfilePreviewCard from "@/components/profile/ProfilePreviewCard";

const REFERRAL_AX = 100;

/** Ukrainian pluralization for the joined-count summary. */
function formatJoinCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 >= 5 || mod10 === 0 || (mod100 >= 11 && mod100 <= 14) ? "друзів" : mod10 === 1 ? "друг" : "друга";
  return `${count} ${word}`;
}

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

export default function InviteFriendView({ userId, initialInvites }: { userId: string; initialInvites: InviteCode[] }) {
  const { showToast } = useToast();
  const [invites, setInvites] = useState(initialInvites);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const joined = invites.filter((i) => i.usedAt);
  const pending = invites.filter((i) => !i.usedAt);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const supabase = createClient();
      await createInviteCode(supabase, userId);
      const fresh = await getMyInvites(supabase, userId);
      setInvites(fresh);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося створити запрошення.");
      console.error("createInviteCode failed:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy(code: string) {
    const url = `${window.location.origin}/register?invite=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 2000);
    } catch {
      showToast("error", "Не вдалося скопіювати посилання.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2">
        <Gift size={20} className="text-purple-soft" />
        <h1 className="font-display text-lg font-semibold text-ink-primary sm:text-xl">Запросити друга</h1>
      </div>
      <p className="mt-1.5 text-[13px] text-ink-secondary">
        Отримуйте {REFERRAL_AX} AX за кожного друга, який приєднається до ANEXA за вашим посиланням.
      </p>

      <div className="glass mt-5 rounded-2xl border border-border-subtle p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-display text-[22px] font-semibold text-ink-primary">{formatJoinCount(joined.length)}</p>
            <p className="text-[11.5px] text-ink-tertiary">приєдналися</p>
          </div>
          <div>
            <p className="font-display text-[22px] font-semibold text-purple-soft">{joined.length * REFERRAL_AX}</p>
            <p className="text-[11.5px] text-ink-tertiary">AX зароблено</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2.5 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Створити нове посилання-запрошення
        </button>
      </div>

      {pending.length > 0 ? (
        <div className="mt-6">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">
            Активні запрошення
          </h2>
          <div className="flex flex-col gap-2">
            {pending.map((invite) => (
              <div
                key={invite.code}
                className="glass flex items-center justify-between gap-3 rounded-xl border border-border-subtle px-4 py-3"
              >
                <span className="truncate font-mono text-[13px] tracking-wide text-ink-primary">{invite.code}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(invite.code)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-[12px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
                >
                  {copiedCode === invite.code ? (
                    <>
                      <Check size={13} className="text-success" />
                      Скопійовано
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      Копіювати посилання
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">Приєдналися</h2>
        {joined.length === 0 ? (
          <div className="glass rounded-2xl border border-border-subtle p-6 text-center">
            <p className="text-[13px] text-ink-tertiary">Ще ніхто не приєднався за вашими запрошеннями.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {joined.map((invite) => (
              <div key={invite.code} className="glass flex items-center gap-3 rounded-xl border border-border-subtle px-4 py-3">
                {invite.usedById ? (
                  <ProfilePreviewCard userId={invite.usedById}>
                    <Avatar
                      src={invite.usedByAvatarUrl}
                      name={invite.usedByName ?? "?"}
                      size={36}
                      className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[12px] font-semibold text-white"
                    />
                  </ProfilePreviewCard>
                ) : null}
                <div className="min-w-0 flex-1">
                  {invite.usedById ? (
                    <ProfilePreviewCard userId={invite.usedById}>
                      <span className="truncate text-[13px] font-medium text-ink-primary hover:underline">
                        {invite.usedByName ?? "Учасник ANEXA"}
                      </span>
                    </ProfilePreviewCard>
                  ) : (
                    <span className="truncate text-[13px] font-medium text-ink-primary">
                      {invite.usedByName ?? "Учасник ANEXA"}
                    </span>
                  )}
                  <p className="text-[11.5px] text-ink-tertiary">{invite.usedAt ? timeAgo(invite.usedAt) : null}</p>
                </div>
                <span className="shrink-0 text-[12.5px] font-semibold text-purple-soft">+{REFERRAL_AX} AX</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
