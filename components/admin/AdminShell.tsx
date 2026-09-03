"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutGrid,
  Users,
  Layers,
  ShieldCheck,
  FileText,
  Coins,
  CreditCard,
  Repeat,
  Radio,
  BarChart3,
  Bell,
  ScrollText,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

function buildNav(pendingUsers: number, openReports: number): NavSection[] {
  return [
    {
      title: "Платформа",
      items: [
        { label: "Огляд", href: "/admin", icon: LayoutGrid },
        { label: "Користувачі", href: "/admin/users", icon: Users, badge: pendingUsers || undefined },
        { label: "Спільноти", href: "/admin/communities", icon: Layers },
        { label: "Модерація", href: "/admin/moderation", icon: ShieldCheck, badge: openReports || undefined },
        { label: "Пости", href: "/admin/posts", icon: FileText },
      ],
    },
    {
      title: "Монетизація",
      items: [
        { label: "AX Економіка", href: "/admin/economy", icon: Coins },
        { label: "Платежі", href: "/admin/payments", icon: CreditCard },
        { label: "Підписки", href: "/admin/subscriptions", icon: Repeat },
        { label: "Події та Live", href: "/admin/events", icon: Radio },
      ],
    },
    {
      title: "Система",
      items: [
        { label: "Аналітика", href: "/admin/analytics", icon: BarChart3 },
        { label: "Сповіщення", href: "/admin/notifications", icon: Bell },
        { label: "Журнал дій", href: "/admin/audit-log", icon: ScrollText },
        { label: "Налаштування", href: "/admin/settings", icon: Settings },
      ],
    },
  ];
}

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Огляд",
  "/admin/users": "Користувачі",
  "/admin/communities": "Спільноти",
  "/admin/moderation": "Модерація",
  "/admin/posts": "Пости",
  "/admin/economy": "AX Економіка",
  "/admin/payments": "Платежі",
  "/admin/subscriptions": "Підписки",
  "/admin/events": "Події та Live",
  "/admin/analytics": "Аналітика",
  "/admin/notifications": "Сповіщення",
  "/admin/audit-log": "Журнал дій",
  "/admin/settings": "Налаштування",
};

export default function AdminShell({
  children,
  fullName,
  avatarUrl,
  pendingUsers,
  openReports,
}: {
  children: React.ReactNode;
  fullName: string;
  avatarUrl: string | null;
  pendingUsers: number;
  openReports: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const sections = buildNav(pendingUsers, openReports);
  const pageTitle = PAGE_TITLES[pathname] ?? "Admin";
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      {navOpen ? (
        <div onClick={() => setNavOpen(false)} aria-hidden="true" className="fixed inset-0 z-40 bg-black/50 md:hidden" />
      ) : null}

      <aside
        className={
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-border-subtle bg-base px-3 py-5 transition-transform duration-200 ease-out md:static md:translate-x-0 " +
          (navOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-grad-purple-blue text-[13px] font-bold text-white shadow-glow-purple">
              AX
            </div>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-ink-primary">ANEXA</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">Admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            aria-label="Закрити меню"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-tertiary hover:bg-white/[0.05] hover:text-ink-primary md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {sections.map((section, i) => (
            <div key={section.title} className={i > 0 ? "mt-4" : undefined}>
              <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
                {section.title}
              </p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.href === pathname;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setNavOpen(false)}
                      className={
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition-colors " +
                        (active
                          ? "bg-white/[0.06] text-ink-primary"
                          : "text-ink-secondary hover:bg-white/[0.05] hover:text-ink-primary")
                      }
                    >
                      <Icon size={17} className="shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-grad-purple-blue px-1.5 text-[11px] font-medium text-white shadow-glow-purple">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-4 border-t border-border-subtle pt-3">
          <div className="flex items-center gap-2.5 px-2">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-grad-purple-blue text-[11px] font-semibold text-white">
                {initials || "?"}
              </div>
            )}
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[12.5px] font-medium text-ink-primary">{fullName}</p>
              <p className="text-[11px] text-ink-tertiary">Super Admin</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Вийти"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border-subtle px-3 sm:gap-4 sm:px-5">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Відкрити меню"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-secondary hover:bg-white/[0.05] hover:text-ink-primary md:hidden"
          >
            <Menu size={18} />
          </button>
          <p className="shrink-0 truncate text-[13px] text-ink-tertiary">
            Admin <span className="mx-1">/</span> <span className="text-ink-primary">{pageTitle}</span>
          </p>
          <div className="mx-auto hidden max-w-md flex-1 items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-1.5 text-[12.5px] text-ink-tertiary md:flex">
            <Search size={14} />
            <span>Пошук користувачів, спільнот, постів...</span>
          </div>
          <Link
            href="/dashboard"
            className="ml-auto shrink-0 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[12px] text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary sm:px-3"
          >
            До платформи
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
