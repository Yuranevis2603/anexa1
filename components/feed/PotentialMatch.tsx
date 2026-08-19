"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { requestConnection } from "@/lib/connections";
import { initials } from "@/lib/profile";
import { useToast } from "@/components/ui/ToastProvider";
import type { MatchCandidate } from "@/lib/match";

export default function PotentialMatch({ userId, match }: { userId: string; match: MatchCandidate }) {
  const { showToast } = useToast();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleConnect() {
    if (sending || sent) return;
    setSending(true);
    try {
      const supabase = createClient();
      await requestConnection(supabase, userId, match.profile.id);
      setSent(true);
      showToast("success", `Запит на знайомство надіслано ${match.profile.full_name}.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося надіслати запит.");
    } finally {
      setSending(false);
    }
  }

  const profileHref = `/dashboard/people/${match.profile.id}`;
  const tagsPreview = match.overlappingTags.slice(0, 3);

  return (
    <section className="glass rounded-2xl border border-purple/20 bg-purple/[0.04] p-4">
      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-purple-soft">
        <span>🔥</span>
        Potential Match
      </div>
      <p className="mt-1 text-[12px] text-ink-tertiary">Можливо, вам варто познайомитися</p>

      <div className="mt-3 flex items-start gap-3">
        <Link href={profileHref} className="shrink-0">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[13px] font-semibold text-white">
            {match.profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.profile.avatar_url} alt={match.profile.full_name} className="h-full w-full object-cover" />
            ) : (
              initials(match.profile.full_name)
            )}
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={profileHref}
              className="truncate text-[13.5px] font-medium text-ink-primary hover:underline"
            >
              {match.profile.full_name}
            </Link>
            <span className="shrink-0 rounded-full bg-grad-purple-blue px-2 py-0.5 text-[11px] font-semibold text-white shadow-glow-purple">
              {match.score}% match
            </span>
          </div>
          {match.profile.role_title || match.profile.company ? (
            <p className="truncate text-[12px] text-ink-tertiary">
              {[match.profile.role_title, match.profile.company].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {tagsPreview.length > 0 ? (
            <p className="mt-1 truncate text-[12px] text-ink-secondary">{tagsPreview.join(" · ")}</p>
          ) : match.profile.bio ? (
            <p className="mt-1 line-clamp-2 text-[12px] text-ink-secondary">{match.profile.bio}</p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={handleConnect}
        disabled={sending || sent}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity disabled:opacity-60"
      >
        {sending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : sent ? (
          <Check size={14} />
        ) : (
          <UserPlus size={14} />
        )}
        {sent ? "Запит надіслано" : "Познайомитися"}
      </button>
    </section>
  );
}
