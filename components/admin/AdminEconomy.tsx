import { Coins, Wallet, TrendingUp } from "lucide-react";
import type { AdminAxStats } from "@/lib/admin";
import Avatar from "@/components/ui/Avatar";

function KpiCard({ icon: Icon, label, value }: { icon: typeof Coins; label: string; value: string }) {
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

export default function AdminEconomy({ stats }: { stats: AdminAxStats }) {
  const spent = Math.max(0, stats.totalAxEarned - stats.totalAxBalance);

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink-primary">AX Економіка</h1>
      <p className="mt-1 text-[13px] text-ink-tertiary">Внутрішня валюта платформи — заробляється за активність, поки нічого не можна купити за AX.</p>

      <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <KpiCard icon={TrendingUp} label="Всього AX зароблено" value={stats.totalAxEarned.toLocaleString("uk-UA")} />
        <KpiCard icon={Wallet} label="У обігу (баланс)" value={stats.totalAxBalance.toLocaleString("uk-UA")} />
        <KpiCard icon={Coins} label="Витрачено / списано" value={spent.toLocaleString("uk-UA")} />
      </div>

      <div className="glass mt-5 rounded-2xl border border-border-subtle p-5">
        <p className="text-[13px] font-semibold text-ink-primary">Топ-10 за AX</p>
        {stats.topEarners.length === 0 ? (
          <p className="mt-4 text-[12.5px] text-ink-tertiary">Ще немає даних.</p>
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-border-subtle">
            {stats.topEarners.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 py-2.5">
                <span className="w-5 shrink-0 text-[12px] text-ink-tertiary">{i + 1}</span>
                <Avatar
                  src={null}
                  name={u.fullName}
                  size={30}
                  className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[11px] font-semibold text-white"
                />
                <p className="min-w-0 flex-1 truncate text-[13px] text-ink-primary">{u.fullName}</p>
                <p className="shrink-0 text-[13px] font-semibold text-ink-primary">{u.axPoints.toLocaleString("uk-UA")} AX</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
