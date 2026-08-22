"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, MoreHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateConversation } from "@/lib/messages";
import { type FriendListItem, formatMutualFriends, removeFriend } from "@/lib/connections";
import { useToast } from "@/components/ui/ToastProvider";
import { useOnlineUsers } from "@/lib/presence";
import ProfilePreviewCard from "@/components/profile/ProfilePreviewCard";
import Avatar from "@/components/ui/Avatar";

export default function FriendCard({
  userId,
  friend,
  onRemoved,
}: {
  userId: string;
  friend: FriendListItem;
  onRemoved: (connectionId: string) => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const online = useOnlineUsers().has(friend.friendId);

  const [messaging, setMessaging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleMessage() {
    if (messaging) return;
    setMessaging(true);
    try {
      const supabase = createClient();
      const conversationId = await getOrCreateConversation(supabase, userId, friend.friendId);
      router.push(`/dashboard/messages?c=${conversationId}`);
    } catch (err) {
      showToast("error", "Не вдалося відкрити чат.");
      console.error("getOrCreateConversation failed:", err);
      setMessaging(false);
    }
  }

  async function handleRemove() {
    if (removing) return;
    setMenuOpen(false);
    setRemoving(true);
    try {
      const supabase = createClient();
      await removeFriend(supabase, friend.connectionId);
      onRemoved(friend.connectionId);
    } catch (err) {
      showToast("error", "Не вдалося видалити з друзів.");
      console.error("removeFriend failed:", err);
      setRemoving(false);
    }
  }

  return (
    <div className="glass flex flex-col rounded-2xl border border-border-subtle p-4">
      <div className="flex items-start gap-3">
        <ProfilePreviewCard userId={friend.friendId}>
          <div className="relative shrink-0">
            <Avatar
              src={friend.avatarUrl}
              name={friend.fullName}
              size={44}
              className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[13px] font-semibold text-white"
            />
            {online ? (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-base bg-success" />
            ) : null}
          </div>
        </ProfilePreviewCard>

        <div className="min-w-0 flex-1">
          <ProfilePreviewCard userId={friend.friendId}>
            <p className="truncate text-[13.5px] font-medium text-ink-primary hover:underline">{friend.fullName}</p>
          </ProfilePreviewCard>
          {friend.roleTitle ? <p className="truncate text-[12px] text-ink-tertiary">{friend.roleTitle}</p> : null}
          {friend.company ? <p className="truncate text-[12px] text-ink-tertiary">{friend.company}</p> : null}
        </div>
      </div>

      {friend.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {friend.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-ink-secondary"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-[12px] text-ink-tertiary">{formatMutualFriends(friend.mutualCount)}</p>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleMessage}
          disabled={messaging}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-[12.5px] font-medium text-ink-primary transition-colors hover:bg-white/[0.06] disabled:opacity-60"
        >
          {messaging ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
          Написати
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            disabled={removing}
            aria-label="Ще"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary disabled:opacity-60"
          >
            {removing ? <Loader2 size={14} className="animate-spin" /> : <MoreHorizontal size={15} />}
          </button>

          {menuOpen ? (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-xl border border-border-strong bg-base-card shadow-2xl">
                <button
                  type="button"
                  onClick={handleRemove}
                  className="w-full px-3.5 py-2.5 text-left text-[12.5px] text-danger transition-colors hover:bg-white/[0.05]"
                >
                  Видалити з друзів
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
