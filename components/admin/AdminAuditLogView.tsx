import { ScrollText } from "lucide-react";
import type { AdminAuditLogEntry } from "@/lib/admin";

const ACTION_LABELS: Record<string, string> = {
  approve_profile: "Підтвердив(ла) профіль",
  delete_post: "Видалив(ла) пост",
  broadcast_notification: "Надіслав(ла) розсилку",
  update_level: "Змінив(ла) рівень",
  grant_ax: "Нарахував(ла) AX",
  deduct_ax: "Зняв(ла) AX",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminAuditLogView({ entries }: { entries: AdminAuditLogEntry[] }) {
  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink-primary">Журнал дій</h1>
      <p className="mt-1 text-[13px] text-ink-tertiary">Останні {entries.length} дій адміністраторів.</p>

      <div className="glass mt-5 rounded-2xl border border-border-subtle p-2">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <ScrollText size={22} className="text-ink-tertiary" />
            <p className="mt-3 text-[13px] text-ink-tertiary">Ще немає жодної зафіксованої дії.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border-subtle">
            {entries.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] text-ink-primary">
                    <span className="font-medium">{e.adminName}</span> — {ACTION_LABELS[e.action] ?? e.action}
                  </p>
                  {e.detail ? <p className="mt-0.5 truncate text-[12px] text-ink-tertiary">{e.detail}</p> : null}
                </div>
                <span className="shrink-0 text-[11.5px] text-ink-tertiary">{formatDate(e.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
