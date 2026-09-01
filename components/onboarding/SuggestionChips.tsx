export default function SuggestionChips({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            aria-pressed={active}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
              active
                ? "border-transparent bg-grad-purple-blue text-white shadow-glow-purple"
                : "border-border-subtle bg-white/[0.03] text-ink-secondary hover:border-border-strong hover:text-ink-primary"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
