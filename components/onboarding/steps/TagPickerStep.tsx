"use client";

import SuggestionChips from "../SuggestionChips";
import StepNav from "../StepNav";
import TagInput from "@/components/profile/TagInput";

export default function TagPickerStep({
  title,
  subtitle,
  options,
  values,
  onChange,
  placeholder,
  onBack,
  onSkip,
  onNext,
  saving,
  error,
}: {
  title: string;
  subtitle: string;
  options: readonly string[];
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  saving: boolean;
  error: string | null;
}) {
  function toggle(opt: string) {
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  }

  return (
    <div>
      <h2 className="font-display text-[20px] font-semibold text-ink-primary">{title}</h2>
      <p className="mt-1.5 text-[13.5px] text-ink-secondary">{subtitle}</p>

      <div className="mt-5">
        <SuggestionChips options={options} selected={values} onToggle={toggle} />
      </div>

      <div className="mt-4">
        <TagInput label="Або додайте свій варіант" values={values} onChange={onChange} placeholder={placeholder} />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-[12.5px] text-danger">
          {error}
        </p>
      )}

      <StepNav onBack={onBack} onSkip={onSkip} onNext={onNext} saving={saving} />
    </div>
  );
}
