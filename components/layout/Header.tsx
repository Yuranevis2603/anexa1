"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/ui/Avatar";
import NotificationBell from "./NotificationBell";
import GlobalSearch from "./GlobalSearch";

function UserMenu({
  userName,
  userRole,
  avatarUrl,
}: {
  userName: string;
  userRole?: string;
  avatarUrl?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
          {userRole ? <p className="text-[11px] text-ink-tertiary">{userRole}</p> : null}
        </div>
        <ChevronDown size={14} className="hidden text-ink-tertiary sm:block" />
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-xl border border-border-strong bg-base-card py-1.5 shadow-2xl">
          <Link
            href="/dashboard/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary"
          >
            <UserIcon size={15} />
            Профіль
          </Link>
          <div className="my-1.5 border-t border-border-subtle" />
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
          >
            <LogOut size={15} />
            {signingOut ? "Виходимо…" : "Вийти"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

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

        <GlobalSearch />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {userId ? <NotificationBell userId={userId} initialUnreadCount={unreadNotifications} /> : null}
        <UserMenu userName={userName} userRole={userRole} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
