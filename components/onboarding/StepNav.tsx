"use client";

import { Loader2 } from "lucide-react";

export default function StepNav({
  onBack,
  onSkip,
  onNext,
  saving,
  nextLabel = "Продовжити",
  nextDisabled = false,
}: {
  onBack?: () => void;
  onSkip?: () => void;
  onNext: () => void;
  saving: boolean;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-7 flex items-center justify-between gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="rounded-lg px-3 py-2 text-[13px] font-medium text-ink-tertiary transition-colors hover:text-ink-primary disabled:opacity-50"
        >
          Назад
        </button>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-2.5">
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            disabled={saving}
            className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink-primary disabled:opacity-50"
          >
            Пропустити
          </button>
        ) : null}
        <button
          type="button"
          onClick={onNext}
          disabled={saving || nextDisabled}
          className="flex items-center gap-2 rounded-lg bg-grad-purple-blue px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
