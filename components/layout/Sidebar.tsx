"use client";

import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { Home, Users, MessageCircle, User, Settings, Bookmark, X } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

const primaryNav: NavItem[] = [
  { label: "Головна", href: "/dashboard", icon: Home },
  { label: "Збережені", href: "/dashboard/saved", icon: Bookmark },
  { label: "Люди", href: "/dashboard/people", icon: Users },
  { label: "Повідомлення", href: "/dashboard/messages", icon: MessageCircle, badge: 5 },
  { label: "Профіль", href: "/dashboard/profile", icon: User },
  { label: "Налаштування", href: "/dashboard/settings", icon: Settings },
];

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
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const activePath = usePathname();

  return (
    <aside
      className={
        "glass fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-border-subtle px-3 py-5 transition-transform duration-200 ease-out md:static md:translate-x-0 " +
        (open ? "translate-x-0" : "-translate-x-full")
      }
    >
      <div className="mb-6 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-grad-purple-blue text-sm font-bold text-white shadow-glow-purple">
            A
          </div>
          <span className="font-display text-[15px] font-semibold text-ink-primary">Anexa Club</span>
        </div>
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
