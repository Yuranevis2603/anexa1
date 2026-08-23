"use client";

import { useState } from "react";
import { Loader2, MoreHorizontal, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createEvent, deleteEvent, updateEvent, type EventItem, type EventStatus } from "@/lib/events";
import { useToast } from "@/components/ui/ToastProvider";
import ModalPortal from "@/components/ui/ModalPortal";

const MONTHS = ["січ", "лют", "бер", "квіт", "трав", "черв", "лип", "серп", "вер", "жовт", "лист", "груд"];

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventsSection({
  communityId,
  userId,
  initialEvents,
}: {
  communityId: string;
  userId: string;
  initialEvents: EventItem[];
}) {
  const { showToast } = useToast();
  const [events, setEvents] = useState(initialEvents);
  const [editing, setEditing] = useState<EventItem | "new" | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  async function remove(e: EventItem) {
    setMenuFor(null);
    try {
      await deleteEvent(createClient(), e.id);
      setEvents((prev) => prev.filter((x) => x.id !== e.id));
    } catch (err) {
      showToast("error", "Не вдалося видалити подію.");
      console.error("deleteEvent failed:", err);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[16px] font-semibold text-ink-primary">Події та ефіри</p>
          <p className="mt-0.5 text-[12.5px] text-ink-tertiary">Заплановані активності спільноти</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-xl bg-grad-purple-blue px-4 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
        >
          <Plus size={14} /> Створити подію
        </button>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 py-16 text-center">
          <p className="text-[13.5px] text-ink-tertiary">Подій ще немає</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((e) => {
            const d = new Date(e.eventDate);
            const draft = e.status === "draft";
            return (
              <div key={e.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border-subtle bg-white/[0.028] p-4">
                <div className="flex w-[52px] shrink-0 flex-col items-center rounded-xl border border-purple/25 bg-purple/[0.1] py-1.5">
                  <span className="font-display text-[18px] font-semibold text-ink-primary">{d.getDate()}</span>
                  <span className="text-[10px] uppercase tracking-wide text-purple-soft">{MONTHS[d.getMonth()]}</span>
                </div>
                <div className="min-w-[180px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-ink-primary">{e.title}</p>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10.5px] font-semibold ${
                        draft ? "border-gold/30 bg-gold/[0.12] text-gold" : "border-success/30 bg-success/[0.12] text-success"
                      }`}
                    >
                      {draft ? "Чернетка" : "Опубліковано"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-ink-tertiary">
                    {d.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                    {e.location ? ` · ${e.location}` : ""} · {e.attendeeCount} записались
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(e)}
                    className="rounded-lg border border-border-subtle bg-white/[0.04] px-3.5 py-2 text-[12.5px] font-medium text-ink-primary transition-colors hover:bg-white/[0.09]"
                  >
                    Редагувати
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuFor(menuFor === e.id ? null : e.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-white/[0.03] text-ink-tertiary transition-colors hover:bg-white/[0.08] hover:text-ink-primary"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {menuFor === e.id ? (
                      <div className="glass absolute right-0 top-11 z-10 w-40 overflow-hidden rounded-xl border border-border-subtle">
                        <button
                          type="button"
                          onClick={() => remove(e)}
                          className="w-full px-3.5 py-2.5 text-left text-[12.5px] font-medium text-danger transition-colors hover:bg-white/[0.06]"
                        >
                          Видалити
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing ? (
        <EventModal
          communityId={communityId}
          userId={userId}
          event={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setEvents((prev) => {
              const exists = prev.some((x) => x.id === saved.id);
              return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved];
            });
          }}
        />
      ) : null}
    </div>
  );
}

function EventModal({
  communityId,
  userId,
  event,
  onClose,
  onSaved,
}: {
  communityId: string;
  userId: string;
  event: EventItem | null;
  onClose: () => void;
  onSaved: (event: EventItem) => void;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(event?.title ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [eventDate, setEventDate] = useState(event ? toLocalInputValue(event.eventDate) : "");
  const [status, setStatus] = useState<EventStatus>(event?.status ?? "draft");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const isoDate = new Date(eventDate).toISOString();
      if (event) {
        await updateEvent(supabase, event.id, {
          title: title.trim(),
          location: location.trim() || null,
          description: event.description,
          eventDate: isoDate,
          status,
        });
        onSaved({ ...event, title: title.trim(), location: location.trim() || null, eventDate: isoDate, status });
      } else {
        const created = await createEvent(supabase, userId, {
          title: title.trim(),
          description: null,
          location: location.trim() || null,
          eventDate: isoDate,
          communityId,
          status,
        });
        onSaved(created);
      }
    } catch (err) {
      showToast("error", "Не вдалося зберегти подію.");
      console.error("save event failed:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4" onClick={onClose} role="presentation">
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass w-full max-w-sm overflow-hidden rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold text-ink-primary">{event ? "Редагувати подію" : "Створити подію"}</h2>
            <button type="button" onClick={onClose} aria-label="Закрити" className="rounded-lg p-1.5 text-ink-tertiary hover:bg-white/[0.06] hover:text-ink-primary">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Назва *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Дата й час *</label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Формат / місце</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="напр. Ефір · Zoom"
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
              />
            </div>
            <div className="flex gap-1.5 rounded-lg border border-border-subtle bg-white/[0.03] p-1">
              {(["draft", "published"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 rounded-md py-1.5 text-[12px] font-medium transition-colors ${
                    status === s ? "bg-grad-purple-blue text-white" : "text-ink-tertiary"
                  }`}
                >
                  {s === "draft" ? "Чернетка" : "Опубліковано"}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2.5 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              Зберегти
            </button>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
