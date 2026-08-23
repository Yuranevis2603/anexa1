"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createEvent, type EventItem } from "@/lib/events";
import ModalPortal from "@/components/ui/ModalPortal";

export default function CreateEventModal({
  userId,
  communityId,
  onClose,
  onCreated,
}: {
  userId: string;
  communityId?: string;
  onClose: () => void;
  onCreated: (event: EventItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Назва обов'язкова.");
      return;
    }
    if (!dateValue) {
      setError("Оберіть дату й час.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const event = await createEvent(supabase, userId, {
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        eventDate: new Date(dateValue).toISOString(),
        communityId,
      });
      onCreated(event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося створити подію.");
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
          className="glass w-full max-w-md overflow-hidden rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold text-ink-primary">Створити подію</h2>
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
              <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Назва *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="напр. Networking-вечір ANEXA"
                required
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Дата й час *</label>
                <input
                  type="datetime-local"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary focus:outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Локація</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="напр. Київ, або онлайн"
                  className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Опис</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Про що подія, кому буде цікаво..."
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
