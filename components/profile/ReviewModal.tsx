"use client";

import { useState } from "react";
import { Loader2, Star, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { submitReview } from "@/lib/gamification";
import { useToast } from "@/components/ui/ToastProvider";
import ModalPortal from "@/components/ui/ModalPortal";

export default function ReviewModal({
  reviewerId,
  revieweeId,
  revieweeName,
  onClose,
  onSubmitted,
}: {
  reviewerId: string;
  revieweeId: string;
  revieweeName: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Оберіть оцінку від 1 до 5.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      await submitReview(supabase, reviewerId, revieweeId, rating, comment);
      showToast("success", "Дякуємо за відгук.");
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося надіслати відгук.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4">
      <div className="glass w-full max-w-sm rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold text-ink-primary">Оцінити співпрацю</h2>
          <button
            onClick={onClose}
            aria-label="Закрити"
            className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-[13px] text-ink-secondary">Як пройшла співпраця з {revieweeName}?</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${n} з 5`}
                className="p-1"
              >
                <Star
                  size={28}
                  className={(hoverRating || rating) >= n ? "fill-gold text-gold" : "text-ink-tertiary"}
                />
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Коментар (необов'язково)"
            className="w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
          />

          {error && <p className="text-center text-[12.5px] text-danger">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2.5 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Надіслати відгук
          </button>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
