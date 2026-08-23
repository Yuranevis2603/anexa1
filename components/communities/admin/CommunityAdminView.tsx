"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { formatMemberCount, type Community, type CommunityMember } from "@/lib/communities";
import { ROLE_UA, type AuditRow, type BannedRow, type CommunityRole, type JoinRequestRow } from "@/lib/communityAdmin";
import type { EventItem } from "@/lib/events";
import Avatar from "@/components/ui/Avatar";
import OverviewSection from "./OverviewSection";
import RequestsSection from "./RequestsSection";
import MembersSection from "./MembersSection";
import BannedSection from "./BannedSection";
import EventsSection from "./EventsSection";
import RulesSection from "./RulesSection";
import SettingsSection from "./SettingsSection";
import AuditSection from "./AuditSection";

export type Section = "overview" | "requests" | "members" | "banned" | "events" | "rules" | "settings" | "audit";

const PERMS: Record<CommunityRole, Section[]> = {
  owner: ["overview", "requests", "members", "banned", "events", "rules", "settings", "audit"],
  admin: ["overview", "requests", "members", "banned", "events", "rules", "audit"],
  moderator: ["overview", "requests", "members"],
  member: [],
};

const NAV: { group: string; items: { key: Section; label: string }[] }[] = [
  { group: "Аналітика", items: [{ key: "overview", label: "Огляд" }] },
  {
    group: "Люди",
    items: [
      { key: "requests", label: "Заявки" },
      { key: "members", label: "Учасники та ролі" },
      { key: "banned", label: "Заблоковані" },
    ],
  },
  {
    group: "Контент",
    items: [
      { key: "events", label: "Події та ефіри" },
      { key: "rules", label: "Правила" },
    ],
  },
  {
    group: "Спільнота",
    items: [
      { key: "settings", label: "Налаштування" },
      { key: "audit", label: "Журнал дій" },
    ],
  },
];

const NO_ACCESS_HINT: Record<CommunityRole, string> = {
  moderator: "Модератори працюють із заявками, учасниками та оглядом. Налаштування, події, правила й журнал дій доступні власнику та адміністраторам.",
  admin: "Цей розділ доступний лише власнику спільноти.",
  owner: "",
  member: "",
};

export default function CommunityAdminView({
  community,
  role,
  userId,
  initialMembers,
  initialJoinRequests,
  initialBanned,
  initialAuditLog,
  initialEvents,
}: {
  community: Community;
  role: CommunityRole;
  userId: string;
  initialMembers: CommunityMember[];
  initialJoinRequests: JoinRequestRow[];
  initialBanned: BannedRow[];
  initialAuditLog: AuditRow[];
  initialEvents: EventItem[];
}) {
  const allowed = PERMS[role];
  const [section, setSection] = useState<Section>("overview");
  const active = allowed.includes(section) ? section : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href={`/dashboard/communities/${community.id}`}
            aria-label="Назад до спільноти"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-white/[0.03] text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
          >
            <ArrowLeft size={16} />
          </Link>
          <Avatar
            src={community.iconUrl}
            name={community.name}
            size={44}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-grad-purple-blue text-[15px] font-semibold text-white shadow-glow-purple"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display truncate text-xl font-semibold text-ink-primary">Керування спільнотою</h1>
              <span className="rounded-full border border-purple/35 bg-purple/10 px-2.5 py-0.5 text-[10.5px] font-semibold tracking-wide text-purple-soft">
                {ROLE_UA[role]}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[12.5px] text-ink-tertiary">
              {community.name} · {formatMemberCount(community.memberCount)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[236px_minmax(0,1fr)]">
        <nav className="flex flex-row gap-1.5 overflow-x-auto rounded-2xl border border-border-subtle bg-white/[0.028] p-3 lg:sticky lg:top-5 lg:flex-col lg:gap-4 lg:overflow-visible">
          {NAV.map((g) => (
            <div key={g.group} className="flex shrink-0 flex-row gap-1.5 lg:flex-col lg:gap-0.5">
              <p className="hidden px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary lg:block">
                {g.group}
              </p>
              {g.items.map((item) => {
                const locked = !allowed.includes(item.key);
                const on = item.key === active;
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={locked}
                    onClick={() => setSection(item.key)}
                    className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                      locked
                        ? "cursor-not-allowed text-ink-tertiary/50"
                        : on
                          ? "bg-purple/[0.14] text-ink-primary"
                          : "text-ink-secondary hover:bg-white/[0.06] hover:text-ink-primary"
                    }`}
                  >
                    {item.label}
                    {locked ? <Lock size={11} className="shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="flex min-w-0 flex-col gap-4">
          {active === null ? (
            <div className="glass flex flex-col items-center gap-3 rounded-2xl border border-border-subtle p-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border-subtle bg-white/[0.03] text-ink-tertiary">
                <Lock size={20} />
              </div>
              <p className="text-[15px] font-semibold text-ink-primary">Розділ недоступний для вашої ролі</p>
              <p className="max-w-md text-[13px] leading-relaxed text-ink-tertiary">{NO_ACCESS_HINT[role]}</p>
            </div>
          ) : null}

          {active === "overview" ? (
            <OverviewSection communityId={community.id} createdBy={community.createdBy} onNavigate={setSection} />
          ) : null}
          {active === "requests" ? (
            <RequestsSection communityId={community.id} userId={userId} initialRequests={initialJoinRequests} />
          ) : null}
          {active === "members" ? (
            <MembersSection communityId={community.id} userId={userId} viewerRole={role} initialMembers={initialMembers} />
          ) : null}
          {active === "banned" ? (
            <BannedSection communityId={community.id} userId={userId} initialBanned={initialBanned} />
          ) : null}
          {active === "events" ? (
            <EventsSection communityId={community.id} userId={userId} initialEvents={initialEvents} />
          ) : null}
          {active === "rules" ? <RulesSection community={community} /> : null}
          {active === "settings" ? <SettingsSection community={community} /> : null}
          {active === "audit" ? <AuditSection auditLog={initialAuditLog} /> : null}
        </div>
      </div>
    </div>
  );
}
