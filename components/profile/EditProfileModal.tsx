"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { initials, uploadAvatar, type Profile } from "@/lib/profile";
import TagInput from "./TagInput";
import ModalPortal from "@/components/ui/ModalPortal";

type EditableFields = {
  full_name: string;
  role_title: string;
  company: string;
  avatar_url: string;
  bio: string;
  location: string;
  skills: string[];
  business_goals: string[];
  interests: string[];
  industries: string[];
};

function toEditable(profile: Profile): EditableFields {
  return {
    full_name: profile.full_name ?? "",
    role_title: profile.role_title ?? "",
    company: profile.company ?? "",
    avatar_url: profile.avatar_url ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    skills: profile.skills ?? [],
    business_goals: profile.business_goals ?? [],
    interests: profile.interests ?? [],
    industries: profile.industries ?? [],
  };
}

export default function EditProfileModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile;
  onClose: () => void;
  onSaved: (updated: Profile) => void;
}) {
  const [form, setForm] = useState<EditableFields>(toEditable(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarCleared, setAvatarCleared] = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Зображення завелике (максимум 5 МБ).");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarCleared(false);
  }

  function removeAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarCleared(true);
  }

  const avatarDisplayUrl = avatarPreview ?? (avatarCleared ? null : form.avatar_url || null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError("Повне ім'я обов'язкове.");
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();

    let avatarUrl = avatarCleared ? null : form.avatar_url.trim() || null;
    if (avatarFile) {
      try {
        avatarUrl = await uploadAvatar(supabase, profile.id, avatarFile);
      } catch (err) {
        setSaving(false);
        setError(err instanceof Error ? err.message : "Не вдалося завантажити фото.");
        return;
      }
    }

    const payload = {
      full_name: form.full_name.trim(),
      role_title: form.role_title.trim() || null,
      company: form.company.trim() || null,
      avatar_url: avatarUrl,
      bio: form.bio.trim() || null,
      location: form.location.trim() || null,
      skills: form.skills,
      business_goals: form.business_goals,
      interests: form.interests,
      industries: form.industries,
      updated_at: new Date().toISOString(),
    };

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profile.id)
      .select()
      .single();

    setSaving(false);

    if (updateError) {
      setError("Не вдалося зберегти профіль. Спробуйте ще раз.");
      return;
    }

    onSaved(data as Profile);
  }

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4">
      <div className="glass max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold text-ink-primary">Редагувати профіль</h2>
          <button
            onClick={onClose}
            aria-label="Закрити"
            className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Field
            label="Повне ім'я *"
            value={form.full_name}
            onChange={(v) => setForm({ ...form, full_name: v })}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Посада"
              value={form.role_title}
              onChange={(v) => setForm({ ...form, role_title: v })}
              placeholder="напр. Співвласник"
            />
            <Field
              label="Компанія"
              value={form.company}
              onChange={(v) => setForm({ ...form, company: v })}
              placeholder="напр. Lumen Studio"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Локація"
              value={form.location}
              onChange={(v) => setForm({ ...form, location: v })}
              placeholder="напр. Київ, Україна"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">Фото профілю</label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-subtle bg-white/[0.04] text-lg font-semibold text-ink-primary">
                {avatarDisplayUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarDisplayUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(form.full_name || "?")
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
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">Про мене</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={4}
              className="w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
              placeholder="Кілька речень про вас та ваш бізнес"
            />
          </div>

          <TagInput
            label="Навички"
            values={form.skills}
            onChange={(v) => setForm({ ...form, skills: v })}
            placeholder="напр. AI, Маркетинг"
          />
          <TagInput
            label="Поточні цілі"
            values={form.business_goals}
            onChange={(v) => setForm({ ...form, business_goals: v })}
            placeholder="напр. Запустити SaaS"
          />
          <TagInput
            label="Кого шукаю"
            values={form.interests}
            onChange={(v) => setForm({ ...form, interests: v })}
            placeholder="напр. Розробники, Клієнти"
          />
          <TagInput
            label="Чим можу допомогти"
            values={form.industries}
            onChange={(v) => setForm({ ...form, industries: v })}
            placeholder="напр. AI-автоматизація, CRM"
          />

          {error && <p className="text-[12.5px] text-danger">{error}</p>}

          <div className="mt-1 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Зберегти профіль
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
      />
    </div>
  );
}
