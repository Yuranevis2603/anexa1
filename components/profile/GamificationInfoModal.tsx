"use client";

import { Star, Trophy, X, Zap } from "lucide-react";
import type { Level } from "@/lib/gamification";

const AX_SOURCES: { label: string; amount: string; cap: string }[] = [
  { label: "Профіль заповнено на 100%", amount: "+100", cap: "один раз" },
  { label: "Отриманий відгук", amount: "+20", cap: "до 5 на день" },
  { label: "Прийняте знайомство", amount: "+10", cap: "до 5 на день, обом" },
  { label: "Доданий проєкт", amount: "+15", cap: "до 2 на день" },
  { label: "Опублікований пост", amount: "+5", cap: "до 3 на день" },
  { label: "Коментар на твій пост", amount: "+2", cap: "до 10 на день" },
  { label: "Лайк на твій пост", amount: "+1", cap: "до 20 на день" },
  { label: "Новий підписник", amount: "+1", cap: "до 15 на день" },
];

export default function GamificationInfoModal({ levels, onClose }: { levels: Level[]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold text-ink-primary">Як це працює</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
          >
            <X size={18} />
          </button>
        </div>

        <section>
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-blue" />
            <h3 className="text-[13px] font-semibold text-ink-primary">AX (досвід)</h3>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-secondary">
            Нараховується автоматично за активність. Ліміти на день не дають накрутити бали самому собі.
          </p>
          <div className="mt-3 flex flex-col divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle">
            {AX_SOURCES.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] text-ink-primary">{s.label}</p>
                  <p className="text-[11px] text-ink-tertiary">{s.cap}</p>
                </div>
                <span className="shrink-0 text-[13px] font-semibold text-blue">{s.amount}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-ink-tertiary">
            AX-баланс бачиш лише ти сам — іншим користувачам він не показується.
          </p>
        </section>

        <section className="mt-5">
          <div className="flex items-center gap-2">
            <Trophy size={15} className="text-purple-soft" />
            <h3 className="text-[13px] font-semibold text-ink-primary">Рівень</h3>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-secondary">
            Рівень рахується автоматично від суми AX — окремо нараховувати його не треба.
          </p>
          {levels.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {levels
                .slice()
                .sort((a, b) => a.level - b.level)
                .map((l) => (
                  <span
                    key={l.level}
                    className="rounded-full border border-border-subtle bg-white/[0.03] px-2.5 py-1 text-[11.5px] text-ink-secondary"
                  >
                    {l.level}. {l.title} <span className="text-ink-tertiary">({l.min_ax}+)</span>
                  </span>
                ))}
            </div>
          ) : null}
        </section>

        <section className="mt-5">
          <div className="flex items-center gap-2">
            <Star size={15} className="text-gold" />
            <h3 className="text-[13px] font-semibold text-ink-primary">Репутація (відгуки)</h3>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-secondary">
            Хтось, з ким ти реально співпрацював, залишає оцінку 1–5 зірок через кнопку «Оцінити співпрацю»
            (пункт «...» на профілі людини) — один відгук на пару людей. Репутація — це середнє з усіх відгуків,
            і її бачать усі. Автору відгуку відгук нічого не дає, а тому, кого оцінили, — +20 AX.
          </p>
        </section>
      </div>
    </div>
  );
}
