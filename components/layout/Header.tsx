"use client";

import Link from "next/link";
import { Search, ChevronDown, Menu } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import NotificationBell from "./NotificationBell";

export default function Header({
  userId,
  userName = "Марта Коваленко",
  userRole = "Співвласник · Lumen Studio",
  avatarUrl,
  onMenuClick,
  unreadNotifications = 0,
}: {
  userId?: string;
  userName?: string;
  userRole?: string;
  avatarUrl?: string;
  onMenuClick?: () => void;
  unreadNotifications?: number;
}) {
  return (
    <header className="glass relative z-30 flex h-16 items-center justify-between gap-3 border-b border-border-subtle px-4 sm:px-6">
      <div className="flex flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Відкрити меню"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-tertiary hover:bg-white/[0.05] hover:text-ink-primary md:hidden"
        >
          <Menu size={19} />
        </button>

        <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2">
          <Search size={16} className="shrink-0 text-ink-tertiary" />
          <input
            type="text"
            placeholder="Пошук людей, подій, проєктів..."
            className="w-full min-w-0 bg-transparent text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {userId ? <NotificationBell userId={userId} initialUnreadCount={unreadNotifications} /> : null}

        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.05]"
        >
          <Avatar
            src={avatarUrl}
            name={userName}
            size={32}
            className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[11px] font-semibold text-white"
          />
          <div className="hidden text-left sm:block">
            <p className="text-[13px] font-medium text-ink-primary">{userName}</p>
            <p className="text-[11px] text-ink-tertiary">{userRole}</p>
          </div>
          <ChevronDown size={14} className="hidden text-ink-tertiary sm:block" />
        </Link>
      </div>
    </header>
  );
}
