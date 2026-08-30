"use client";

import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Home, Users, UserCheck, MessageCircle, User, Settings, Bookmark, Bell, Gift, ShieldCheck, X } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

type NavSection = {
  /** Omitted for the first, unlabeled section (Головна). */
  title?: string;
  items: NavItem[];
};

function buildPrimaryNav(
  unreadMessages: number,
  pendingConnections: number,
  unreadNotifications: number,
  isPlatformAdmin: boolean
): NavSection[] {
  const sections: NavSection[] = [
    { items: [{ label: "Головна", href: "/dashboard", icon: Home }] },
    {
      title: "Контент",
      items: [
        { label: "Збережені", href: "/dashboard/saved", icon: Bookmark },
        { label: "Спільноти", href: "/dashboard/communities", icon: Users },
      ],
    },
    {
      title: "Люди",
      items: [
        {
          label: "Друзі",
          href: "/dashboard/friends",
          icon: UserCheck,
          badge: pendingConnections > 0 ? pendingConnections : undefined,
        },
        {
          label: "Повідомлення",
          href: "/dashboard/messages",
          icon: MessageCircle,
          badge: unreadMessages > 0 ? unreadMessages : undefined,
        },
        {
          label: "Сповіщення",
          href: "/dashboard/notifications",
          icon: Bell,
          badge: unreadNotifications > 0 ? unreadNotifications : undefined,
        },
      ],
    },
    {
      title: "Акаунт",
      items: [
        { label: "Профіль", href: "/dashboard/profile", icon: User },
        { label: "Запросити друга", href: "/dashboard/invite", icon: Gift },
        { label: "Налаштування", href: "/dashboard/settings", icon: Settings },
      ],
    },
  ];

  if (isPlatformAdmin) {
    sections.push({
      title: "Адміністрування",
      items: [{ label: "Адмін-панель", href: "/admin", icon: ShieldCheck }],
    });
  }

  return sections;
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
    <Link
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
    </Link>
  );
}

export default function Sidebar({
  open = false,
  onClose,
  unreadMessages = 0,
  pendingConnections = 0,
  unreadNotifications = 0,
  isPlatformAdmin = false,
}: {
  open?: boolean;
  onClose?: () => void;
  unreadMessages?: number;
  pendingConnections?: number;
  unreadNotifications?: number;
  isPlatformAdmin?: boolean;
}) {
  const activePath = usePathname();
  const navSections = buildPrimaryNav(unreadMessages, pendingConnections, unreadNotifications, isPlatformAdmin);

  return (
    <aside
      className={
        "glass fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-border-subtle px-3 py-5 transition-transform duration-200 ease-out md:static md:translate-x-0 " +
        (open ? "translate-x-0" : "-translate-x-full")
      }
    >
      <div className="relative mb-6 flex items-center justify-center px-2">
        <Image src="/anexa-logo-wordmark.png" alt="ANEXA" width={118} height={36} className="h-9 w-auto" priority />

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити меню"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-tertiary hover:bg-white/[0.05] hover:text-ink-primary md:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {navSections.map((section, i) => (
          <div key={section.title ?? `section-${i}`} className={i > 0 ? "mt-4" : undefined}>
            {section.title ? (
              <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
                {section.title}
              </p>
            ) : null}
            <div className="flex flex-col gap-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={item.href === activePath}
                  onNavigate={onClose}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
