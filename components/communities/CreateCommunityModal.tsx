"use client";

import { useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/profile";
import { createCommunity, type Community } from "@/lib/communities";
import Avatar from "@/components/ui/Avatar";
import ModalPortal from "@/components/ui/ModalPortal";

export default function CreateCommunityModal({
  userId,
  onClose,
  onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: (community: Community) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Зображення завелике (максимум 5 МБ).");
      return;
    }
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Назва обов'язкова.");
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();

    let iconUrl: string | null = null;
    if (iconFile) {
      try {
        iconUrl = await uploadAvatar(supabase, userId, iconFile);
      } catch (err) {
        setSaving(false);
        setError(err instanceof Error ? err.message : "Не вдалося завантажити іконку.");
        return;
      }
    }

    try {
      const community = await createCommunity(supabase, userId, {
        name: name.trim(),
        iconUrl,
        description: description.trim() || null,
        category: category.trim() || null,
      });
      onCreated(community);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося створити спільноту.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-sm overflow-hidden rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[15px] font-semibold text-ink-primary">Створити спільноту</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0"
              aria-label="Обрати іконку"
            >
              <Avatar
                src={iconPreview}
                name={name || "?"}
                size={56}
                className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[16px] font-semibold text-white"
              />
            </button>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-border-subtle px-3 py-1.5 text-[12px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary"
              >
                Обрати іконку
              </button>
              <p className="mt-1 text-[11px] text-ink-tertiary">Необов&apos;язково</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleIconChange} className="hidden" />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Назва *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="напр. Маркетологи ANEXA"
              required
              className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Категорія</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="напр. Засновники, Інвестиції"
              className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Опис</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Для кого ця спільнота і про що в ній говорять..."
              className="w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
            />
          </div>

          {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2.5 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            Створити
          </button>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
