"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Check, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type Community, formatMemberCount, joinCommunity, leaveCommunity } from "@/lib/communities";
import type { EventItem } from "@/lib/events";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";
import EventsView from "@/components/events/EventsView";

export default function CommunityDetailView({
  userId,
  initialCommunity,
  initialEvents,
}: {
  userId: string;
  initialCommunity: Community;
  initialEvents: EventItem[];
}) {
  const { showToast } = useToast();
  const [community, setCommunity] = useState(initialCommunity);
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    if (pending) return;
    setPending(true);
    try {
      const supabase = createClient();
      if (community.isMember) {
        await leaveCommunity(supabase, userId, community.id);
        setCommunity((c) => ({ ...c, isMember: false, memberCount: c.memberCount - 1 }));
      } else {
        await joinCommunity(supabase, userId, community.id);
        setCommunity((c) => ({ ...c, isMember: true, memberCount: c.memberCount + 1 }));
      }
    } catch (err) {
      showToast("error", community.isMember ? "Не вдалося вийти зі спільноти." : "Не вдалося приєднатися.");
      console.error("community membership toggle failed:", err);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/communities"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-ink-tertiary transition-colors hover:text-ink-primary"
      >
        <ArrowLeft size={14} />
        Усі спільноти
      </Link>

      <div className="glass flex flex-col items-center gap-3 rounded-2xl border border-border-subtle p-6 text-center sm:flex-row sm:text-left">
        <Avatar
          src={community.iconUrl}
          name={community.name}
          size={64}
          className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[18px] font-semibold text-white"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg font-semibold text-ink-primary">{community.name}</h1>
          <p className="mt-0.5 text-[12.5px] text-ink-tertiary">{formatMemberCount(community.memberCount)}</p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending}
          className={`flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-[12.5px] font-medium transition-opacity disabled:opacity-60 ${
            community.isMember
              ? "border border-border-subtle text-ink-primary hover:bg-white/[0.06]"
              : "bg-grad-purple-blue text-white shadow-glow-purple hover:opacity-90"
          }`}
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : community.isMember ? (
            <Check size={14} />
          ) : (
            <UserPlus size={14} />
          )}
          {community.isMember ? "Ви учасник" : "Приєднатися"}
        </button>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">
          <Calendar size={13} />
          Події спільноти
        </h2>
        <EventsView userId={userId} initialEvents={initialEvents} communityId={community.id} showTitle={false} />
      </div>
    </div>
  );
}
