"use client";

import type { LucideIcon } from "lucide-react";
import { Home, Users, MessageCircle, User, Settings } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

// MVP scope for closed beta: Feed, Connections, Messages, Profile, Settings.
// Everything else from the full module list (Events, Communities, Companies,
// Tracker, Projects, Academy, AI, Meetings, Leaderboard, Referrals, Finance)
// comes back once its turn arrives in the roadmap (see docs/instructions.md).
const primaryNav: NavItem[] = [
  { label: "Головна", href: "/dashboard", icon: Home },
  { label: "Люди", href: "/dashboard/people", icon: Users },
  { label: "Повідомлення", href: "/dashboard/messages", icon: MessageCircle, badge: 5 },
  { label: "Профіль", href: "/dashboard/profile", icon: User },
  { label: "Налаштування", href: "/dashboard/settings", icon: Settings },
];

function NavLink({ item, active }: { item: NavItem; active?: boolean }) {
  const Icon = item.icon;
  const activeClasses = "bg-white/[0.06] text-ink-primary";
  const inactiveClasses = "text-ink-secondary hover:bg-white/[0.05] hover:text-ink-primary";
  return (
    <a
      href={item.href}
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

export default function Sidebar({ activePath = "/dashboard" }: { activePath?: string }) {
  return (
    <aside className="glass flex h-screen w-64 shrink-0 flex-col border-r border-border-subtle px-3 py-5">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-grad-purple-blue text-sm font-bold text-white shadow-glow-purple">
          A
        </div>
        <span className="font-display text-[15px] font-semibold text-ink-primary">Anexa Club</span>
      </div>

      <nav className="flex flex-col gap-1">
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} active={item.href === activePath} />
        ))}
      </nav>
    </aside>
  );
}
