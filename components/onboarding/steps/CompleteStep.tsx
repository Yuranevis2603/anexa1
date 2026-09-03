"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { OnboardingDraft } from "../OnboardingFlow";

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-[13.5px]">
      {done ? (
        <CheckCircle2 size={17} className="shrink-0 text-success" />
      ) : (
        <Circle size={17} className="shrink-0 text-ink-tertiary" />
      )}
      <span className={done ? "text-ink-primary" : "text-ink-tertiary"}>{label}</span>
    </div>
  );
}

export default function CompleteStep({
  draft,
  onFinish,
  saving,
  error,
}: {
  draft: OnboardingDraft;
  onFinish: () => void;
  saving: boolean;
  error: string | null;
}) {
  const items = [
    { label: "Профіль", done: Boolean(draft.full_name.trim() && (draft.bio.trim() || draft.location.trim() || draft.role_title.trim())) },
    { label: "Навички", done: draft.skills.length > 0 },
    { label: "Інтереси", done: draft.interests.length > 0 },
    { label: "Цілі", done: draft.business_goals.length > 0 },
  ];

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-grad-purple-blue shadow-glow-purple">
        <CheckCircle2 size={28} className="text-white" />
      </div>

      <h2 className="font-display mt-5 text-[21px] font-semibold text-ink-primary">Ваш профіль ANEXA готовий</h2>
      <p className="mt-1.5 text-[13.5px] text-ink-secondary">Ось що ми зберегли — все це можна змінити будь-коли в налаштуваннях профілю.</p>

      <div className="mt-6 flex w-full flex-col gap-2.5 rounded-xl border border-border-subtle bg-white/[0.02] p-4 text-left">
        {items.map((item) => (
          <ChecklistItem key={item.label} label={item.label} done={item.done} />
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-[12.5px] text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onFinish}
        disabled={saving}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-grad-purple-blue px-6 py-3 text-[14.5px] font-semibold text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        Увійти в ANEXA
      </button>
    </div>
  );
}
