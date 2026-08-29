"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Bell, CalendarClock, Check, Heart, Loader2, Megaphone, MessageCircle, Star, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  describeNotification,
  formatNotificationTime,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  type Notification,
  type NotificationType,
} from "@/lib/notifications";
import Avatar from "@/components/ui/Avatar";

const TYPE_ICON: Record<NotificationType, { Icon: typeof Bell; className: string }> = {
  like: { Icon: Heart, className: "bg-danger/10 text-danger" },
  comment: { Icon: MessageCircle, className: "bg-blue/10 text-blue" },
  follow: { Icon: UserPlus, className: "bg-purple/10 text-purple-soft" },
  connection_request: { Icon: UserPlus, className: "bg-purple/10 text-purple-soft" },
  connection_accepted: { Icon: Check, className: "bg-success/10 text-success" },
  message: { Icon: MessageCircle, className: "bg-blue/10 text-blue" },
  review: { Icon: Star, className: "bg-gold/10 text-gold" },
  referral_joined: { Icon: Users, className: "bg-purple/10 text-purple-soft" },
  profile_approved: { Icon: BadgeCheck, className: "bg-blue/10 text-blue" },
  event_registration: { Icon: CalendarClock, className: "bg-purple/10 text-purple-soft" },
  event_reminder: { Icon: CalendarClock, className: "bg-gold/10 text-gold" },
  admin_broadcast: { Icon: Megaphone, className: "bg-purple/10 text-purple-soft" },
};

/** Live "who's online"-style bell: seeds from the server-rendered unread
 * count, refetches it on any notification insert Realtime delivers (RLS
 * scopes what actually lands, same pattern as the messages badge), and
 * lazily loads the recent list only when the dropdown is first opened. */
export default function NotificationBell({ userId, initialUnreadCount }: { userId: string; initialUnreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("notifications:badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        getUnreadNotificationCount(supabase, userId).then(setUnreadCount);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && notifications === null) {
      setLoading(true);
      const supabase = createClient();
      getNotifications(supabase, userId, 8).then((data) => {
        setNotifications(data);
        setLoading(false);
      });
    }
  }

  async function handleSelect(n: Notification) {
    setOpen(false);
    const { href } = describeNotification(n);
    if (!n.readAt) {
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => (prev ? prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) : prev));
      try {
        await markNotificationRead(createClient(), n.id);
      } catch (err) {
        console.error("markNotificationRead failed:", err);
      }
    }
    router.push(href);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Сповіщення"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:bg-white/[0.05] hover:text-ink-secondary"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-grad-purple-blue px-1 text-[10px] font-medium text-white shadow-glow-purple">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-20 w-80 overflow-hidden rounded-xl border border-border-strong bg-base-card shadow-2xl">
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-ink-tertiary" />
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <p className="px-4 py-5 text-center text-[12.5px] text-ink-tertiary">Немає нових сповіщень.</p>
            ) : (
              notifications.map((n) => {
                const { text } = describeNotification(n);
                const { Icon, className } = TYPE_ICON[n.type];
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleSelect(n)}
                    className={`flex w-full items-center gap-3 border-t border-border-subtle px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-white/[0.05] ${
                      n.readAt ? "" : "bg-white/[0.02]"
                    }`}
                  >
                    {n.actorAvatarUrl !== null || n.actorName ? (
                      <Avatar
                        src={n.actorAvatarUrl}
                        name={n.actorName ?? "?"}
                        size={36}
                        className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[11px] font-semibold text-white"
                      />
                    ) : (
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${className}`}>
                        <Icon size={16} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[13px] ${n.readAt ? "text-ink-secondary" : "font-medium text-ink-primary"}`}>
                        {text}
                      </p>
                      <p className="text-[11px] text-ink-tertiary">{formatNotificationTime(n.createdAt)}</p>
                    </div>
                    {!n.readAt ? <span className="h-2 w-2 shrink-0 rounded-full bg-grad-purple-blue" /> : null}
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/dashboard/notifications");
            }}
            className="block w-full border-t border-border-subtle px-4 py-2.5 text-center text-[12.5px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary"
          >
            Переглянути всі
          </button>
        </div>
      ) : null}
    </div>
  );
}
