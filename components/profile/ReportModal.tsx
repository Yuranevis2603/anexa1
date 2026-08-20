"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { reportUser } from "@/lib/moderation";
import { useToast } from "@/components/ui/ToastProvider";

const REASONS = ["Спам", "Шахрайство", "Образлива поведінка", "Фейковий профіль", "Інше"];

export default function ReportModal({
  reporterId,
  reportedId,
  reportedName,
  onClose,
}: {
  reporterId: string;
  reportedId: string;
  reportedName: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      setError("Оберіть причину скарги.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const fullReason = details.trim() ? `${reason}: ${details.trim()}` : reason;
      await reportUser(supabase, reporterId, reportedId, fullReason);
      showToast("success", "Скаргу надіслано.");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося надіслати скаргу.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4">
      <div className="glass w-full max-w-sm rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold text-ink-primary">Поскаржитись на {reportedName}</h2>
          <button
            onClick={onClose}
            aria-label="Закрити"
            className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            {REASONS.map((r) => (
              <label
                key={r}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] transition-colors ${
                  reason === r ? "border-purple/50 bg-purple/10 text-ink-primary" : "border-border-subtle text-ink-secondary hover:bg-white/[0.04]"
                }`}
              >
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="hidden" />
                {r}
              </label>
            ))}
          </div>

          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            placeholder="Деталі (необов'язково)"
            className="w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
          />

          {error && <p className="text-[12.5px] text-danger">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-lg bg-danger px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Надіслати скаргу
          </button>
        </form>
      </div>
    </div>
  );
}
