"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { requestConnection } from "@/lib/connections";
import type { RecommendedPerson } from "@/lib/recommendations";
import { useToast } from "@/components/ui/ToastProvider";
import ProfilePreviewCard from "@/components/profile/ProfilePreviewCard";
import Avatar from "@/components/ui/Avatar";

export default function RecommendationCard({ userId, match }: { userId: string; match: RecommendedPerson }) {
  const { showToast } = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

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

  return (
    <div className="glass flex flex-col rounded-2xl border border-border-subtle p-4">
      <div className="flex items-start gap-3">
        <ProfilePreviewCard userId={match.profile.id}>
          <div className="shrink-0">
            <Avatar
              src={match.profile.avatar_url}
              name={match.profile.full_name}
              size={44}
              className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[13px] font-semibold text-white"
            />
          </div>
        </ProfilePreviewCard>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <ProfilePreviewCard userId={match.profile.id}>
              <p className="truncate text-[13.5px] font-medium text-ink-primary hover:underline">
                {match.profile.full_name}
              </p>
            </ProfilePreviewCard>
            {match.score > 0 ? (
              <span className="shrink-0 rounded-full bg-grad-purple-blue px-2 py-0.5 text-[11px] font-semibold text-white shadow-glow-purple">
                {match.score}% match
              </span>
            ) : null}
          </div>
          {match.profile.role_title || match.profile.company ? (
            <p className="truncate text-[12px] text-ink-tertiary">
              {[match.profile.role_title, match.profile.company].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>

      {match.reasons.length > 0 ? (
        <p className="mt-3 text-[12px] italic text-ink-secondary">«{match.reasons[0]}»</p>
      ) : match.profile.bio ? (
        <p className="mt-3 line-clamp-2 text-[12px] text-ink-secondary">{match.profile.bio}</p>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <Link
          href={`/dashboard/people/${match.profile.id}`}
          className="flex flex-1 items-center justify-center rounded-lg border border-border-subtle px-3 py-2 text-[12.5px] font-medium text-ink-primary transition-colors hover:bg-white/[0.06]"
        >
          Переглянути профіль
        </Link>

        <button
          type="button"
          onClick={handleConnect}
          disabled={sending || sent}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-grad-purple-blue px-3 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity disabled:opacity-60"
        >
          {sending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : sent ? (
            <Check size={14} />
          ) : (
            <UserPlus size={14} />
          )}
          {sent ? "Заявку надіслано" : "Додати в друзі"}
        </button>
      </div>
    </div>
  );
}
