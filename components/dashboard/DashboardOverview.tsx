import Link from "next/link";
import { Sparkles, Bell, CalendarClock } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getLevels, getProfileStats, computeLevelProgress } from "@/lib/gamification";
import { getTotalUnreadCount } from "@/lib/messages";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getEvents, formatEventDate } from "@/lib/events";

type Tile = {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
};

/** Light-weight stat row above the Feed — not a separate route, just three
 * numbers a member would otherwise have to visit three different pages to
 * see (AX/level, unread activity, next event they're registered for). */
export default async function DashboardOverview({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}) {
  const [levels, stats, unreadMessages, unreadNotifications, events] = await Promise.all([
    getLevels(supabase),
    getProfileStats(supabase, userId),
    getTotalUnreadCount(supabase, userId),
    getUnreadNotificationCount(supabase, userId),
    getEvents(supabase, userId),
  ]);

  const progress = computeLevelProgress(stats.ax_points, levels);
  const totalUnread = unreadMessages + unreadNotifications;
  const nextEvent = events
    .filter((e) => e.isRegistered && new Date(e.eventDate).getTime() >= Date.now())
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())[0];

  const tiles: Tile[] = [
    {
      href: "/dashboard/profile",
      icon: <Sparkles size={16} />,
      label: `Рівень ${progress.level} · ${progress.title}`,
      value: `${stats.ax_points} AX`,
      sub: progress.nextLevelAx ? `${progress.progressPercent}% до наступного рівня` : "Максимальний рівень",
    },
    {
      href: "/dashboard/notifications",
      icon: <Bell size={16} />,
      label: "Непрочитане",
      value: String(totalUnread),
      sub: totalUnread > 0 ? "повідомлення й сповіщення" : "усе прочитано",
    },
    nextEvent
      ? {
          href: "/dashboard/communities",
          icon: <CalendarClock size={16} />,
          label: "Найближча подія",
          value: nextEvent.title,
          sub: formatEventDate(nextEvent.eventDate),
        }
      : {
          href: "/dashboard/communities",
          icon: <CalendarClock size={16} />,
          label: "Найближча подія",
          value: "Немає запланованих",
          sub: "події створюються в спільнотах",
        },
  ];

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tiles.map((tile) => (
        <Link
          key={tile.label}
          href={tile.href}
          className="glass flex items-start gap-3 rounded-2xl border border-border-subtle p-4 transition-colors hover:bg-white/[0.03]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-grad-purple-blue text-white shadow-glow-purple">
            {tile.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-ink-tertiary">{tile.label}</span>
            <span className="block truncate text-[15px] font-semibold text-ink-primary">{tile.value}</span>
            {tile.sub ? <span className="block truncate text-[11.5px] text-ink-secondary">{tile.sub}</span> : null}
          </span>
        </Link>
      ))}
    </div>
  );
}
