"use client";

import { useState } from "react";
import { Check, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { requestConnection } from "@/lib/connections";
import type { MatchCandidate } from "@/lib/match";
import { useToast } from "@/components/ui/ToastProvider";
import ProfilePreviewCard from "@/components/profile/ProfilePreviewCard";
import Avatar from "@/components/ui/Avatar";

export default function RecommendationCard({ userId, match }: { userId: string; match: MatchCandidate }) {
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

  const tagsPreview = match.overlappingTags.slice(0, 3);

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
                {match.score}%
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

      {tagsPreview.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tagsPreview.map((tag) => (
            <span key={tag} className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-ink-secondary">
              {tag}
            </span>
          ))}
        </div>
      ) : match.profile.bio ? (
        <p className="mt-3 line-clamp-2 text-[12px] text-ink-secondary">{match.profile.bio}</p>
      ) : null}

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
    </div>
  );
}
