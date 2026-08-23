"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createThread, type DiscussionThread } from "@/lib/discussions";
import ModalPortal from "@/components/ui/ModalPortal";

export default function CreateThreadModal({
  userId,
  communityId,
  onClose,
  onCreated,
}: {
  userId: string;
  communityId: string;
  onClose: () => void;
  onCreated: (thread: DiscussionThread) => void;
}) {
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Заголовок обов'язковий.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const thread = await createThread(supabase, userId, communityId, {
        topic: topic.trim() || null,
        title: title.trim(),
        body: body.trim() || null,
      });
      onCreated(thread);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося створити тему.");
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
          className="glass w-full max-w-lg overflow-hidden rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold text-ink-primary">Почати обговорення</h2>
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
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Тема</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="напр. Фінанси, Команда, Ринки"
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Заголовок *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Про що йдеться?"
                required
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Деталі</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Опишіть контекст питання..."
                className="w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
              />
            </div>

            {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

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
                className="flex items-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity disabled:opacity-60"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                Опублікувати
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
