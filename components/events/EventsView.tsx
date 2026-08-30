"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import type { EventItem } from "@/lib/events";
import EventCard from "./EventCard";

const CreateEventModal = dynamic(() => import("./CreateEventModal"));

export default function EventsView({
  userId,
  initialEvents,
  communityId,
  showTitle = true,
}: {
  userId: string;
  initialEvents: EventItem[];
  /** Scopes "Створити подію" to this community. Pass the community's own
   * event list as initialEvents (already filtered server-side). */
  communityId?: string;
  /** Community pages provide their own "Події" heading — set false there
   * to avoid a duplicate. */
  showTitle?: boolean;
}) {
  const [events, setEvents] = useState(initialEvents);
  useEffect(() => setEvents(initialEvents), [initialEvents]);

  const [createOpen, setCreateOpen] = useState(false);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const upcoming: EventItem[] = [];
    const past: EventItem[] = [];
    for (const e of events) {
      (new Date(e.eventDate).getTime() >= now ? upcoming : past).push(e);
    }
    upcoming.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    past.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
    return { upcoming, past };
  }, [events]);

  const myUpcomingCount = upcoming.filter((e) => e.isRegistered).length;

  function handleChanged(eventId: string, isRegistered: boolean) {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, isRegistered, attendeeCount: e.attendeeCount + (isRegistered ? 1 : -1) } : e
      )
    );
  }

  function handleCreated(event: EventItem) {
    setEvents((prev) => [...prev, event]);
    setCreateOpen(false);
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {showTitle ? <h1 className="font-display text-xl font-semibold text-ink-primary">Події</h1> : null}
          <p className="mt-1 text-[12.5px] text-ink-tertiary">
            {upcoming.length} найближчих, ви йдете на {myUpcomingCount}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 self-start rounded-lg bg-grad-purple-blue px-3.5 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          Створити подію
        </button>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">Найближчі</h2>
        {upcoming.length === 0 ? (
          <div className="glass rounded-2xl border border-border-subtle p-6">
            <p className="text-[13px] text-ink-tertiary">Поки немає запланованих подій.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <EventCard key={event.id} userId={userId} event={event} isPast={false} onChanged={handleChanged} />
            ))}
          </div>
        )}
      </div>

      {past.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">Минулі</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((event) => (
              <EventCard key={event.id} userId={userId} event={event} isPast onChanged={handleChanged} />
            ))}
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <CreateEventModal
          userId={userId}
          communityId={communityId}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      ) : null}
    </div>
  );
}
