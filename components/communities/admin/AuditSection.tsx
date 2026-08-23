"use client";

import { timeAgo, type AuditRow } from "@/lib/communityAdmin";

export default function AuditSection({ auditLog }: { auditLog: AuditRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[16px] font-semibold text-ink-primary">Журнал дій</p>
        <p className="mt-0.5 text-[12.5px] text-ink-tertiary">Останні адміністративні дії</p>
      </div>

      {auditLog.length === 0 ? (
        <p className="py-16 text-center text-[13.5px] text-ink-tertiary">Дій ще не було</p>
      ) : (
        <div className="rounded-2xl border border-border-subtle bg-white/[0.028] px-5">
          {auditLog.map((a) => (
            <div key={a.id} className="flex items-center gap-3.5 border-b border-white/[0.05] py-3.5 last:border-0">
              <div className="min-w-[160px] flex-1">
                <p className="text-[13px] text-ink-secondary">{a.action}</p>
                {a.actorName ? <p className="mt-0.5 text-[11.5px] text-ink-tertiary">{a.actorName}</p> : null}
              </div>
              <span className="shrink-0 text-[11.5px] text-ink-tertiary">{timeAgo(a.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
