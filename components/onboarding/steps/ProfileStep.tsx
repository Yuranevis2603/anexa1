"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { initials, uploadAvatar } from "@/lib/profile";
import SuggestionChips from "../SuggestionChips";
import StepNav from "../StepNav";
import type { OnboardingDraft } from "../OnboardingFlow";

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
      />
    </div>
  );
}

export default function ProfileStep({
  userId,
  draft,
  onChange,
  onBack,
  onNext,
  saving,
  error,
  industryOptions,
}: {
  userId: string;
  draft: OnboardingDraft;
  onChange: (fields: Partial<OnboardingDraft>) => void;
  onBack: () => void;
  onNext: (overrideFields?: Record<string, unknown>) => void;
  saving: boolean;
  error: string | null;
  industryOptions: readonly string[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarCleared, setAvatarCleared] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Зображення завелике (максимум 5 МБ).");
      return;
    }
    setUploadError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarCleared(false);
  }

  function removeAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarCleared(true);
  }

  const avatarDisplayUrl = avatarPreview ?? (avatarCleared ? null : draft.avatar_url || null);

  function toggleIndustry(opt: string) {
    onChange({
      industries: draft.industries.includes(opt)
        ? draft.industries.filter((v) => v !== opt)
        : [...draft.industries, opt],
    });
  }

  async function handleContinue() {
    if (!draft.full_name.trim()) return;

    if (!avatarFile) {
      onNext();
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      const uploadedUrl = await uploadAvatar(supabase, userId, avatarFile);
      onChange({ avatar_url: uploadedUrl });
      onNext({ avatar_url: uploadedUrl });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Не вдалося завантажити фото.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-[20px] font-semibold text-ink-primary">Ваш профіль</h2>
      <p className="mt-1.5 text-[13.5px] text-ink-secondary">
        Заповніть те, що важливо зараз — решту завжди можна додати пізніше.
      </p>

      <div className="mt-6 flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-subtle bg-white/[0.04] text-lg font-semibold text-ink-primary">
          {avatarDisplayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarDisplayUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(draft.full_name || "?")
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-ink-primary transition-colors hover:bg-white/[0.07]"
          >
            <ImagePlus size={14} />
            {avatarDisplayUrl ? "Змінити фото" : "Завантажити фото"}
          </button>
          {avatarDisplayUrl ? (
            <button
              type="button"
              onClick={removeAvatar}
              className="text-[12px] font-medium text-ink-tertiary transition-colors hover:text-danger"
            >
              Прибрати фото
            </button>
          ) : null}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
      </div>
      {uploadError && (
        <p role="alert" className="mt-2 text-[12.5px] text-danger">
          {uploadError}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-4">
        <Field label="Повне ім'я" value={draft.full_name} onChange={(v) => onChange({ full_name: v })} placeholder="Ваше ім'я" />

        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">Про себе</label>
          <textarea
            value={draft.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
            placeholder="Кілька речень про вас та ваш бізнес"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Локація" value={draft.location} onChange={(v) => onChange({ location: v })} placeholder="напр. Київ, Україна" />
          <Field label="Посада" value={draft.role_title} onChange={(v) => onChange({ role_title: v })} placeholder="напр. Співзасновник" />
        </div>

        <Field label="Компанія" value={draft.company} onChange={(v) => onChange({ company: v })} placeholder="напр. Lumen Studio" />

        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">Індустрія</label>
          <SuggestionChips options={industryOptions} selected={draft.industries} onToggle={toggleIndustry} />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-[12.5px] text-danger">
          {error}
        </p>
      )}

      <StepNav onBack={onBack} onNext={handleContinue} saving={saving || uploading} nextDisabled={!draft.full_name.trim()} />
    </div>
  );
}
