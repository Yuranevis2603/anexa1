"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Flag, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markReportReviewed, type UserReport } from "@/lib/moderation";
import { useToast } from "@/components/ui/ToastProvider";

export default function ReportsQueueView({ initialReports }: { initialReports: UserReport[] }) {
  const { showToast } = useToast();
  const [reports, setReports] = useState(initialReports);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  async function handleReview(report: UserReport) {
    if (reviewingId) return;
    setReviewingId(report.id);
    try {
      await markReportReviewed(createClient(), report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      showToast("success", "Скаргу позначено розглянутою.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося оновити скаргу.");
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl">
      <div className="flex items-center gap-2">
        <Flag size={20} className="text-danger" />
        <h2 className="font-display text-lg font-semibold text-ink-primary sm:text-xl">Скарги користувачів</h2>
      </div>
      <p className="mt-1.5 text-[13px] text-ink-secondary">Нерозглянуті скарги на профілі та поведінку учасників.</p>

      <div className="glass mt-5 rounded-2xl border border-border-subtle p-2">
        {reports.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-tertiary">Немає нерозглянутих скарг.</p>
        ) : (
          <div className="flex flex-col">
            {reports.map((report) => (
              <div key={report.id} className="flex items-start gap-3 border-b border-border-subtle px-3 py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ink-primary">
                    <Link href={`/dashboard/people/${report.reportedId}`} className="font-medium hover:underline">
                      {report.reportedName}
                    </Link>{" "}
                    <span className="text-ink-tertiary">— скарга від</span>{" "}
                    <Link href={`/dashboard/people/${report.reporterId}`} className="font-medium hover:underline">
                      {report.reporterName}
                    </Link>
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-secondary">{report.reason}</p>
                  <p className="mt-1 text-[11px] text-ink-tertiary">
                    {new Date(report.createdAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleReview(report)}
                  disabled={reviewingId === report.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle px-3.5 py-2 text-[12.5px] font-medium text-ink-primary transition-colors hover:bg-white/[0.05] disabled:opacity-60"
                >
                  {reviewingId === report.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Розглянуто
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
