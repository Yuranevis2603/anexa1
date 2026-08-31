export default function OnboardingProgress({ step, total }: { step: number; total: number }) {
  const percent = Math.round((step / total) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[11.5px] font-medium text-ink-tertiary">
        <span>
          Крок {step} з {total}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-grad-purple-blue transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
