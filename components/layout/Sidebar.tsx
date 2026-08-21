"use client";

import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Home, Users, MessageCircle, User, Settings, Bookmark, UserPlus, X } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

function buildPrimaryNav(unreadMessages: number, pendingConnections: number): NavItem[] {
  return [
    { label: "Головна", href: "/dashboard", icon: Home },
    { label: "Збережені", href: "/dashboard/saved", icon: Bookmark },
    { label: "Люди", href: "/dashboard/people", icon: Users },
    {
      label: "Запити на знайомство",
      href: "/dashboard/connections",
      icon: UserPlus,
      badge: pendingConnections > 0 ? pendingConnections : undefined,
    },
    {
      label: "Повідомлення",
      href: "/dashboard/messages",
      icon: MessageCircle,
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
    { label: "Профіль", href: "/dashboard/profile", icon: User },
    { label: "Налаштування", href: "/dashboard/settings", icon: Settings },
  ];
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const activeClasses = "bg-white/[0.06] text-ink-primary";
  const inactiveClasses = "text-ink-secondary hover:bg-white/[0.05] hover:text-ink-primary";
  return (
    <a
      href={item.href}
      onClick={onNavigate}
      className={
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition-colors " +
        (active ? activeClasses : inactiveClasses)
      }
    >
      <Icon size={18} className="shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-grad-purple-blue px-1.5 text-[11px] font-medium text-white shadow-glow-purple">
          {item.badge}
        </span>
      ) : null}
    </a>
  );
}

export default function Sidebar({
  open = false,
  onClose,
  unreadMessages = 0,
  pendingConnections = 0,
}: {
  open?: boolean;
  onClose?: () => void;
  unreadMessages?: number;
  pendingConnections?: number;
}) {
  const activePath = usePathname();
  const primaryNav = buildPrimaryNav(unreadMessages, pendingConnections);

  return (
    <aside
      className={
        "glass fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-border-subtle px-3 py-5 transition-transform duration-200 ease-out md:static md:translate-x-0 " +
        (open ? "translate-x-0" : "-translate-x-full")
      }
    >
      <div className="mb-6 flex items-center justify-between px-2">
        <Image src="/anexa-logo-wordmark.png" alt="ANEXA" width={92} height={28} className="h-7 w-auto" priority />

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити меню"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-tertiary hover:bg-white/[0.05] hover:text-ink-primary md:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        {primaryNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={item.href === activePath}
            onNavigate={onClose}
          />
        ))}
      </nav>
    </aside>
  );
}
