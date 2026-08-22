"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/ToastProvider";
import ModalPortal from "@/components/ui/ModalPortal";
import {
  CTA_TYPES,
  POST_TYPES,
  WORK_FORMATS,
  createPost,
  uploadPostImage,
  type CtaType,
  type PostType,
  type WorkFormat,
} from "@/lib/feed";

export default function CreatePostModal({
  userId,
  open,
  onClose,
  onCreated,
}: {
  userId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postType, setPostType] = useState<PostType | null>(null);
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");
  const [workFormat, setWorkFormat] = useState<WorkFormat | "">("");
  const [ctaType, setCtaType] = useState<CtaType | "">("");
  const [showOptional, setShowOptional] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setPostType(null);
    setBody("");
    setCategory("");
    setBudget("");
    setWorkFormat("");
    setCtaType("");
    setShowOptional(false);
    setImageFile(null);
    setImagePreview(null);
    setError(null);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Зображення завелике (максимум 5 МБ).");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!postType) {
      setError("Оберіть тип поста.");
      return;
    }
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Напишіть текст поста.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadPostImage(supabase, userId, imageFile);
      }

      await createPost(supabase, userId, {
        postType,
        body: trimmed,
        imageUrl,
        category: category.trim() || null,
        budget: budget.trim() || null,
        workFormat: workFormat || null,
        ctaType: ctaType || null,
      });

      showToast("success", "Пост опубліковано.");
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося опублікувати пост.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={handleClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border-subtle bg-base-card p-5 sm:rounded-2xl sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold text-ink-primary">Створити пост</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Закрити"
            className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-[12.5px] font-medium text-ink-secondary">Тип поста *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {POST_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setPostType(t.value)}
                  aria-pressed={postType === t.value}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center text-[12px] font-medium transition-colors ${
                    postType === t.value
                      ? "border-purple/60 bg-purple/10 text-ink-primary"
                      : "border-border-subtle text-ink-secondary hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="text-lg leading-none">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="post-body" className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">
              Текст поста *
            </label>
            <textarea
              id="post-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Розкажіть про ідею, проєкт чи можливість..."
              className="w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/40 focus:outline-none"
            />
          </div>

          {imagePreview ? (
            <div className="relative overflow-hidden rounded-xl border border-border-subtle">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="" className="max-h-52 w-full object-cover" />
              <button
                type="button"
                onClick={removeImage}
                aria-label="Прибрати зображення"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-2.5 text-[12.5px] text-ink-secondary transition-colors hover:bg-white/[0.04]"
            >
              <ImagePlus size={16} />
              Додати зображення
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

          <button
            type="button"
            onClick={() => setShowOptional((s) => !s)}
            className="self-start text-[12.5px] font-medium text-purple-soft transition-colors hover:text-purple"
          >
            {showOptional ? "Сховати додаткові поля" : "+ Додати деталі (бюджет, формат, категорія, CTA)"}
          </button>

          {showOptional ? (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-border-subtle p-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor="post-category" className="mb-1.5 block text-[12px] font-medium text-ink-secondary">
                  Категорія
                </label>
                <input
                  id="post-category"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="напр. Маркетинг"
                  className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/40 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="post-budget" className="mb-1.5 block text-[12px] font-medium text-ink-secondary">
                  Бюджет
                </label>
                <input
                  id="post-budget"
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="напр. $500-1000"
                  className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/40 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="post-format" className="mb-1.5 block text-[12px] font-medium text-ink-secondary">
                  Формат роботи
                </label>
                <select
                  id="post-format"
                  value={workFormat}
                  onChange={(e) => setWorkFormat(e.target.value as WorkFormat | "")}
                  className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13px] text-ink-primary focus:border-purple/40 focus:outline-none"
                >
                  <option value="" className="bg-base-card text-ink-primary">
                    Не вказано
                  </option>
                  {WORK_FORMATS.map((f) => (
                    <option key={f.value} value={f.value} className="bg-base-card text-ink-primary">
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="post-cta" className="mb-1.5 block text-[12px] font-medium text-ink-secondary">
                  CTA-кнопка
                </label>
                <select
                  id="post-cta"
                  value={ctaType}
                  onChange={(e) => setCtaType(e.target.value as CtaType | "")}
                  className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13px] text-ink-primary focus:border-purple/40 focus:outline-none"
                >
                  <option value="" className="bg-base-card text-ink-primary">
                    Без CTA
                  </option>
                  {CTA_TYPES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-base-card text-ink-primary">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

          <div className="mt-1 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity disabled:opacity-60"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Опублікувати
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
