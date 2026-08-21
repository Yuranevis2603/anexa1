"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Bell, ChevronDown, Menu, MessageCircle, UserPlus } from "lucide-react";

export default function Header({
  userName = "Марта Коваленко",
  userRole = "Співвласник · Lumen Studio",
  avatarUrl,
  onMenuClick,
  unreadMessages = 0,
  pendingConnections = 0,
}: {
  userName?: string;
  userRole?: string;
  avatarUrl?: string;
  onMenuClick?: () => void;
  unreadMessages?: number;
  pendingConnections?: number;
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const totalNotifications = unreadMessages + pendingConnections;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Сповіщення"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:bg-white/[0.05] hover:text-ink-secondary"
          >
            <Bell size={18} />
            {totalNotifications > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-grad-purple-blue px-1 text-[10px] font-medium text-white shadow-glow-purple">
                {totalNotifications > 9 ? "9+" : totalNotifications}
              </span>
            ) : null}
          </button>

          {notifOpen ? (
            <div className="absolute right-0 top-11 z-20 w-72 overflow-hidden rounded-xl border border-border-strong bg-base-card shadow-2xl">
              {totalNotifications === 0 ? (
                <p className="px-4 py-5 text-center text-[12.5px] text-ink-tertiary">Немає нових сповіщень.</p>
              ) : (
                <>
                  {unreadMessages > 0 ? (
                    <Link
                      href="/dashboard/messages"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.05]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10">
                        <MessageCircle size={16} className="text-blue" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-ink-primary">Повідомлення</p>
                        <p className="text-[11.5px] text-ink-tertiary">Непрочитаних: {unreadMessages}</p>
                      </div>
                    </Link>
                  ) : null}
                  {pendingConnections > 0 ? (
                    <Link
                      href="/dashboard/connections"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-center gap-3 border-t border-border-subtle px-4 py-3 transition-colors hover:bg-white/[0.05]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple/10">
                        <UserPlus size={16} className="text-purple-soft" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-ink-primary">Запити на знайомство</p>
                        <p className="text-[11.5px] text-ink-tertiary">Нових: {pendingConnections}</p>
                      </div>
                    </Link>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>

        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.05]"
        >
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/10">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={userName} fill sizes="32px" className="object-cover" />
            ) : null}
          </div>
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
