"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CalendarClock, Check, CheckCheck, Heart, Megaphone, MessageCircle, Star, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  describeNotification,
  formatNotificationTime,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
  type NotificationType,
} from "@/lib/notifications";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";

const TYPE_ICON: Record<NotificationType, { Icon: typeof Heart; className: string }> = {
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

export default function NotificationsView({
  userId,
  initialNotifications,
}: {
  userId: string;
  initialNotifications: Notification[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function handleSelect(n: Notification) {
    const { href } = describeNotification(n);
    if (!n.readAt) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      try {
        await markNotificationRead(createClient(), n.id);
      } catch (err) {
        console.error("markNotificationRead failed:", err);
      }
    }
    router.push(href);
  }

  async function handleMarkAllRead() {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    try {
      await markAllNotificationsRead(createClient(), userId);
    } catch (err) {
      showToast("error", "Не вдалося позначити всі як прочитані.");
      console.error("markAllNotificationsRead failed:", err);
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink-primary">Сповіщення</h1>
          {unreadCount > 0 ? <p className="mt-1 text-[12.5px] text-ink-tertiary">Непрочитаних: {unreadCount}</p> : null}
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-[12.5px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary disabled:opacity-60"
          >
            <CheckCheck size={14} />
            Позначити всі прочитаними
          </button>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <div className="glass mt-4 rounded-2xl border border-border-subtle p-6">
          <p className="text-[13px] text-ink-tertiary">Поки немає сповіщень.</p>
        </div>
      ) : (
        <div className="glass mt-4 overflow-hidden rounded-2xl border border-border-subtle">
          {notifications.map((n) => {
            const { text } = describeNotification(n);
            const { Icon, className } = TYPE_ICON[n.type];
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleSelect(n)}
                className={`flex w-full items-center gap-3 border-b border-border-subtle px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-white/[0.05] ${
                  n.readAt ? "" : "bg-white/[0.02]"
                }`}
              >
                {n.actorAvatarUrl !== null || n.actorName ? (
                  <Avatar
                    src={n.actorAvatarUrl}
                    name={n.actorName ?? "?"}
                    size={40}
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[12px] font-semibold text-white"
                  />
                ) : (
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${className}`}>
                    <Icon size={17} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[13.5px] ${n.readAt ? "text-ink-secondary" : "font-medium text-ink-primary"}`}>
                    {text}
                  </p>
                  <p className="text-[11.5px] text-ink-tertiary">{formatNotificationTime(n.createdAt)}</p>
                </div>
                {!n.readAt ? <span className="h-2 w-2 shrink-0 rounded-full bg-grad-purple-blue" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
