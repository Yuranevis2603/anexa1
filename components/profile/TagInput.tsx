"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">{label}</label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border-subtle bg-white/[0.03] px-2.5 py-2 focus-within:border-purple/50">
        {values.map((v, i) => (
          <span
            key={v}
            className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] text-ink-primary"
          >
            {v}
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label={`Прибрати ${v}`}
              className="text-ink-tertiary transition-colors hover:text-danger"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={values.length === 0 ? placeholder : ""}
          className="min-w-[80px] flex-1 bg-transparent py-0.5 text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
        />
      </div>
      <p className="mt-1 text-[11px] text-ink-tertiary">Enter або кома, щоб додати</p>
    </div>
  );
}
