import { Users, ShieldCheck, Layers, UserPlus } from "lucide-react";
import type { AdminOverviewStats } from "@/lib/admin";
import Avatar from "@/components/ui/Avatar";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "щойно";
  if (minutes < 60) return `${minutes} хв тому`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  return `${days} дн тому`;
}

function KpiCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-ink-tertiary">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] text-ink-tertiary">
          <Icon size={14} />
        </span>
      </div>
      <p className="font-display mt-2 text-[26px] font-semibold leading-none text-ink-primary">{value}</p>
    </div>
  );
}

export default function AdminOverview({ stats }: { stats: AdminOverviewStats }) {
  const maxDay = Math.max(1, ...stats.signupsByDay.map((d) => d.count));

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink-primary">Огляд платформи</h1>
      <p className="mt-1 text-[13px] text-ink-tertiary">Дані станом на зараз · оновлюється при кожному відкритті сторінки</p>

      <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Всього користувачів" value={stats.totalUsers.toLocaleString("uk-UA")} />
        <KpiCard icon={ShieldCheck} label="На перевірці" value={stats.pendingUsers.toLocaleString("uk-UA")} />
        <KpiCard icon={Layers} label="Спільноти" value={stats.totalCommunities.toLocaleString("uk-UA")} />
        <KpiCard icon={UserPlus} label="Нових за тиждень" value={stats.newUsersThisWeek.toLocaleString("uk-UA")} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="glass rounded-2xl border border-border-subtle p-5">
          <p className="text-[13px] font-semibold text-ink-primary">Реєстрації за 30 днів</p>
          <p className="text-[12px] text-ink-tertiary">
            {stats.signupsByDay.reduce((s, d) => s + d.count, 0)} нових профілів
          </p>
          <div className="mt-5 flex h-40 items-end gap-1">
            {stats.signupsByDay.map((d, i) => (
              <div
                key={i}
                className="min-h-[2px] flex-1 rounded-t bg-grad-purple-blue"
                style={{ height: `${Math.max(2, (d.count / maxDay) * 100)}%` }}
                title={`${d.count}`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-ink-tertiary">
            <span>30 днів тому</span>
            <span>сьогодні</span>
          </div>
        </div>

        <div className="glass rounded-2xl border border-border-subtle p-5">
          <p className="text-[13px] font-semibold text-ink-primary">Останні реєстрації</p>
          {stats.recentUsers.length === 0 ? (
            <p className="mt-4 text-[12.5px] text-ink-tertiary">Ще ніхто не реєструвався за останні 30 днів.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {stats.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5">
                  <Avatar
                    src={u.avatarUrl}
                    name={u.fullName}
                    size={30}
                    className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[11px] font-semibold text-white"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-ink-primary">{u.fullName}</p>
                    <p className="truncate text-[11px] text-ink-tertiary">{[u.roleTitle, u.company].filter(Boolean).join(" · ") || "—"}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-ink-tertiary">{timeAgo(u.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
