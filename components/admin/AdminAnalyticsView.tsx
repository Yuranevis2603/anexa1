import { FileText, MessageCircle, Heart, Handshake, UserPlus } from "lucide-react";
import type { AdminAnalytics } from "@/lib/admin";

function KpiCard({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-ink-tertiary">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] text-ink-tertiary">
          <Icon size={14} />
        </span>
      </div>
      <p className="font-display mt-2 text-[22px] font-semibold leading-none text-ink-primary">{value}</p>
    </div>
  );
}

export default function AdminAnalyticsView({ analytics }: { analytics: AdminAnalytics }) {
  const maxDay = Math.max(1, ...analytics.postsByDay.map((d) => d.count));

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink-primary">Аналітика</h1>
      <p className="mt-1 text-[13px] text-ink-tertiary">Загальна активність платформи. Розширена аналітика (воронки, ретеншн) поки не підключена.</p>

      <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={FileText} label="Пости" value={analytics.totalPosts.toLocaleString("uk-UA")} />
        <KpiCard icon={MessageCircle} label="Коментарі" value={analytics.totalComments.toLocaleString("uk-UA")} />
        <KpiCard icon={Heart} label="Лайки" value={analytics.totalLikes.toLocaleString("uk-UA")} />
        <KpiCard icon={Handshake} label="Знайомства" value={analytics.totalConnections.toLocaleString("uk-UA")} />
        <KpiCard icon={UserPlus} label="Підписки" value={analytics.totalFollows.toLocaleString("uk-UA")} />
      </div>

      <div className="glass mt-5 rounded-2xl border border-border-subtle p-5">
        <p className="text-[13px] font-semibold text-ink-primary">Пости за 30 днів</p>
        <p className="text-[12px] text-ink-tertiary">{analytics.postsByDay.reduce((s, d) => s + d.count, 0)} постів</p>
        <div className="mt-5 flex h-40 items-end gap-1">
          {analytics.postsByDay.map((d, i) => (
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
    </div>
  );
}
