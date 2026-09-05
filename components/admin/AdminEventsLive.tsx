"use client";

import { useState } from "react";
import { CalendarClock, Loader2, Radio } from "lucide-react";
import { endLivestream } from "@/lib/livestreams";
import type { AdminEvent, AdminLivestream } from "@/lib/admin";
import { useToast } from "@/components/ui/ToastProvider";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uk-UA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminEventsLive({ events, livestreams }: { events: AdminEvent[]; livestreams: AdminLivestream[] }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState(livestreams);
  const [endingId, setEndingId] = useState<string | null>(null);

  const live = rows.filter((s) => s.status === "live");
  const past = rows.filter((s) => s.status !== "live");

  async function handleEnd(streamId: string) {
    if (endingId) return;
    setEndingId(streamId);
    try {
      await endLivestream(streamId);
      setRows((prev) => prev.map((s) => (s.id === streamId ? { ...s, status: "ended" } : s)));
      showToast("success", "Ефір завершено.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося завершити ефір.");
    } finally {
      setEndingId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink-primary">Події та Live</h1>
      <p className="mt-1 text-[13px] text-ink-tertiary">Події та трансляції усіх спільнот платформи.</p>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl border border-border-subtle p-5">
          <div className="flex items-center gap-2">
            <CalendarClock size={15} className="text-purple-soft" />
            <p className="text-[13px] font-semibold text-ink-primary">Найближчі події</p>
          </div>
          {events.length === 0 ? (
            <p className="mt-4 text-[12.5px] text-ink-tertiary">Подій ще не створено.</p>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-border-subtle">
              {events.map((e) => (
                <div key={e.id} className="py-2.5">
                  <p className="text-[13px] font-medium text-ink-primary">{e.title}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-tertiary">
                    {e.communityName ?? "Без спільноти"} · {formatDate(e.eventDate)} · {e.registrationCount} реєстрацій
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl border border-border-subtle p-5">
          <div className="flex items-center gap-2">
            <Radio size={15} className="text-danger" />
            <p className="text-[13px] font-semibold text-ink-primary">
              Наживо {live.length > 0 ? `(${live.length})` : ""}
            </p>
          </div>
          {live.length === 0 ? (
            <p className="mt-4 text-[12.5px] text-ink-tertiary">Зараз немає активних трансляцій.</p>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-border-subtle">
              {live.map((s) => (
                <div key={s.id} className="flex items-center gap-2 py-2.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink-primary">{s.title}</p>
                    <p className="truncate text-[11.5px] text-ink-tertiary">
                      {s.communityName} · веде {s.hostName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEnd(s.id)}
                    disabled={endingId === s.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-danger/35 px-3 py-1.5 text-[11.5px] font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
                  >
                    {endingId === s.id ? <Loader2 size={12} className="animate-spin" /> : null}
                    Завершити
                  </button>
                </div>
              ))}
            </div>
          )}

          {past.length > 0 ? (
            <>
              <p className="mt-5 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">Останні завершені</p>
              <div className="mt-2 flex flex-col divide-y divide-border-subtle">
                {past.slice(0, 5).map((s) => (
                  <div key={s.id} className="py-2">
                    <p className="truncate text-[12.5px] text-ink-secondary">{s.title}</p>
                    <p className="text-[11px] text-ink-tertiary">
                      {s.communityName} · {formatDate(s.startedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
