"use client";

import { useEffect, useState } from "react";
import { Loader2, UserCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getOverviewStats, ROLE_UA, type CommunityRole, type OverviewStats } from "@/lib/communityAdmin";
import type { Section } from "./CommunityAdminView";

const ROLE_ORDER: CommunityRole[] = ["owner", "admin", "moderator", "member"];

export default function OverviewSection({
  communityId,
  createdBy,
  onNavigate,
}: {
  communityId: string;
  createdBy: string | null;
  onNavigate: (section: Section) => void;
}) {
  const [stats, setStats] = useState<OverviewStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOverviewStats(createClient(), communityId, createdBy).then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => {
      cancelled = true;
    };
  }, [communityId, createdBy]);

  if (!stats) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={18} className="animate-spin text-ink-tertiary" />
      </div>
    );
  }

  const cards = [
    { label: "Учасників", value: stats.memberCount, icon: Users },
    { label: "Приєдналось за тиждень", value: stats.joinedLast7Days, icon: UserCheck },
    { label: "Заявок очікують", value: stats.pendingRequests, icon: UserCheck },
  ];
  const maxJoins = Math.max(1, ...stats.joinsByDay.map((d) => d.count));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border-subtle bg-white/[0.028] p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-tertiary">{c.label}</p>
            <p className="font-display mt-2 text-[26px] font-semibold text-ink-primary">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-border-subtle bg-white/[0.028] p-5">
          <p className="text-[14.5px] font-semibold text-ink-primary">Нові учасники</p>
          <p className="mt-0.5 text-[12px] text-ink-tertiary">За останні 14 днів</p>
          <div className="mt-5 flex h-[150px] items-end gap-1.5">
            {stats.joinsByDay.map((d, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t bg-grad-purple-blue"
                  style={{ height: `${Math.max(3, Math.round((d.count / maxJoins) * 130))}px` }}
                  title={`${d.count}`}
                />
                <span className="text-[9.5px] text-ink-tertiary">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border-subtle bg-white/[0.028] p-5">
            <p className="mb-3 text-[14.5px] font-semibold text-ink-primary">Потребує вашої уваги</p>
            <button
              type="button"
              onClick={() => onNavigate("requests")}
              className="flex w-full items-center gap-3 rounded-xl border border-border-subtle bg-white/[0.03] p-3.5 text-left transition-colors hover:border-purple/30"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple/[0.16] text-[13px] font-bold text-purple-soft">
                {stats.pendingRequests}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ink-primary">Заявки на вступ</span>
                <span className="block text-[11.5px] text-ink-tertiary">Очікують рішення</span>
              </span>
            </button>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-white/[0.028] p-5">
            <p className="mb-3 text-[14.5px] font-semibold text-ink-primary">Ролі учасників</p>
            <div className="flex flex-col gap-2.5">
              {ROLE_ORDER.filter((r) => stats.roleCounts[r] > 0).map((r) => {
                const pct = stats.memberCount > 0 ? Math.round((stats.roleCounts[r] / stats.memberCount) * 100) : 0;
                return (
                  <div key={r}>
                    <div className="flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="text-ink-secondary">{ROLE_UA[r]}</span>
                      <span className="font-semibold text-purple-soft">{stats.roleCounts[r]}</span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-white/[0.05]">
                      <div className="h-1 rounded-full bg-grad-purple-blue" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
