"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Loader2, CheckCircle2, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { initials, profileCompleteness, type Profile } from "@/lib/profile";

type EditableFields = {
  full_name: string;
  role_title: string;
  company: string;
  avatar_url: string;
  bio: string;
};

function toEditable(profile: Profile): EditableFields {
  return {
    full_name: profile.full_name ?? "",
    role_title: profile.role_title ?? "",
    company: profile.company ?? "",
    avatar_url: profile.avatar_url ?? "",
    bio: profile.bio ?? "",
  };
}

export default function ProfileView({
  profile,
  email,
  viewerIsOwner = true,
}: {
  profile: Profile;
  email?: string;
  viewerIsOwner?: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(profile);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<EditableFields>(toEditable(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeness = profileCompleteness(current);

  function openModal() {
    setForm(toEditable(current));
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError("Повне ім'я обов'язкове.");
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      full_name: form.full_name.trim(),
      role_title: form.role_title.trim() || null,
      company: form.company.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      bio: form.bio.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", current.id)
      .select()
      .single();

    setSaving(false);

    if (updateError) {
      setError("Не вдалося зберегти профіль. Спробуйте ще раз.");
      return;
    }

    setCurrent(data as Profile);
    setModalOpen(false);
    router.refresh(); // keeps Header (name/avatar) in sync
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Profile header card */}
      <section className="glass overflow-hidden rounded-2xl border border-border-subtle">
        <div className="h-28 bg-grad-purple-blue" />

        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-base-card bg-white/10 text-2xl font-semibold text-ink-primary">
              {current.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.avatar_url}
                  alt={current.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(current.full_name)
              )}
            </div>

            {viewerIsOwner ? (
              <button
                onClick={openModal}
                className="flex items-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
              >
                <Pencil size={14} />
                Редагувати профіль
              </button>
            ) : null}
          </div>

          <div className="mt-4">
            <h1 className="font-display text-xl font-semibold text-ink-primary">
              {current.full_name}
            </h1>
            <p className="mt-0.5 text-[13.5px] text-ink-secondary">
              {[current.role_title, current.company].filter(Boolean).join(" · ") ||
                "Посада та компанія ще не вказані"}
            </p>
            {viewerIsOwner && email ? (
              <p className="mt-1 text-[12px] text-ink-tertiary">{email}</p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* About */}
        <section className="glass rounded-2xl border border-border-subtle p-6 md:col-span-2">
          <h2 className="font-display text-[15px] font-semibold text-ink-primary">
            Про мене
          </h2>
          {current.bio ? (
            <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-secondary">
              {current.bio}
            </p>
          ) : (
            <p className="mt-3 text-[13.5px] text-ink-tertiary">
              Розкажіть іншим учасникам, чим ви займаєтесь — натисніть
              «Редагувати профіль».
            </p>
          )}

          {viewerIsOwner && !current.is_approved && (
            <div className="mt-5 rounded-lg border border-gold/25 bg-gold/10 px-4 py-3">
              <p className="text-[12.5px] text-gold-soft">
                Ваш профіль ще очікує підтвердження модератором закритої
                бета-версії.
              </p>
            </div>
          )}
        </section>

        {/* Completeness */}
        <aside className="glass h-fit rounded-2xl border border-border-subtle p-6">
          <h3 className="text-[13px] font-medium text-ink-primary">
            Заповненість профілю
          </h3>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-semibold text-ink-primary">
              {completeness}%
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-grad-purple-blue transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {(
              [
                ["full_name", "Повне ім'я"],
                ["role_title", "Посада"],
                ["company", "Компанія"],
                ["avatar_url", "Фото профілю"],
                ["bio", "Про мене"],
              ] as [keyof Profile, string][]
            ).map(([field, label]) => {
              const done = Boolean(
                typeof current[field] === "string" &&
                  (current[field] as string).trim()
              );
              return (
                <li
                  key={field}
                  className="flex items-center gap-2 text-[12.5px] text-ink-secondary"
                >
                  {done ? (
                    <CheckCircle2 size={14} className="shrink-0 text-success" />
                  ) : (
                    <Circle size={14} className="shrink-0 text-ink-tertiary" />
                  )}
                  {label}
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      {/* Edit modal */}
      {viewerIsOwner && modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="glass max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-subtle bg-base-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-[16px] font-semibold text-ink-primary">
                Редагувати профіль
              </h2>
              <button
                onClick={() => setModalOpen(false)}
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
              <Field
                label="URL фото профілю"
                value={form.avatar_url}
                onChange={(v) => setForm({ ...form, avatar_url: v })}
                placeholder="https://..."
                type="url"
              />
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">
                  Про мене
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
                  placeholder="Кілька речень про вас та ваш бізнес"
                />
              </div>

              {error && (
                <p className="text-[12.5px] text-danger">{error}</p>
              )}

              <div className="mt-1 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
      )}
    </div>
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
      <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">
        {label}
      </label>
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
