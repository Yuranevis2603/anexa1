"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type Community, formatMemberCount, joinCommunity, leaveCommunity } from "@/lib/communities";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";

export default function CommunityCard({
  userId,
  community,
  onChanged,
}: {
  userId: string;
  community: Community;
  onChanged: (communityId: string, isMember: boolean) => void;
}) {
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    if (pending) return;
    setPending(true);
    try {
      const supabase = createClient();
      if (community.isMember) {
        await leaveCommunity(supabase, userId, community.id);
        onChanged(community.id, false);
      } else {
        await joinCommunity(supabase, userId, community.id);
        onChanged(community.id, true);
      }
    } catch (err) {
      showToast("error", community.isMember ? "Не вдалося вийти зі спільноти." : "Не вдалося приєднатися.");
      console.error("community membership toggle failed:", err);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="glass flex flex-col items-center rounded-2xl border border-border-subtle p-5 text-center">
      <Link href={`/dashboard/communities/${community.id}`} className="flex flex-col items-center">
        <Avatar
          src={community.iconUrl}
          name={community.name}
          size={56}
          className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[16px] font-semibold text-white"
        />

        <p className="mt-3 text-[13.5px] font-medium text-ink-primary hover:underline">{community.name}</p>
      </Link>
      <p className="mt-0.5 text-[12px] text-ink-tertiary">{formatMemberCount(community.memberCount)}</p>

      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-[12.5px] font-medium transition-opacity disabled:opacity-60 ${
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
  );
}
