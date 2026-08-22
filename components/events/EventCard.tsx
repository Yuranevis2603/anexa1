"use client";

import { useState } from "react";
import { Calendar, Check, Loader2, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cancelRegistration, formatEventDate, registerForEvent, type EventItem } from "@/lib/events";
import { formatMemberCount } from "@/lib/communities";
import { useToast } from "@/components/ui/ToastProvider";

export default function EventCard({
  userId,
  event,
  isPast,
  onChanged,
}: {
  userId: string;
  event: EventItem;
  isPast: boolean;
  onChanged: (eventId: string, isRegistered: boolean) => void;
}) {
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    if (pending || isPast) return;
    setPending(true);
    try {
      const supabase = createClient();
      if (event.isRegistered) {
        await cancelRegistration(supabase, userId, event.id);
        onChanged(event.id, false);
      } else {
        await registerForEvent(supabase, userId, event.id);
        onChanged(event.id, true);
      }
    } catch (err) {
      showToast("error", event.isRegistered ? "Не вдалося скасувати реєстрацію." : "Не вдалося зареєструватися.");
      console.error("event registration toggle failed:", err);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`glass flex flex-col rounded-2xl border border-border-subtle p-4 ${isPast ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-purple-soft">
        <Calendar size={13} />
        {formatEventDate(event.eventDate)}
      </div>

      <p className="mt-2 text-[14px] font-medium text-ink-primary">{event.title}</p>

      {event.location ? (
        <p className="mt-1 flex items-center gap-1 text-[12px] text-ink-tertiary">
          <MapPin size={12} /> {event.location}
        </p>
      ) : null}

      {event.description ? (
        <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-secondary">{event.description}</p>
      ) : null}

      <p className="mt-3 text-[12px] text-ink-tertiary">{formatMemberCount(event.attendeeCount)}</p>

      <button
        type="button"
        onClick={handleToggle}
        disabled={pending || isPast}
        className={`mt-3 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[12.5px] font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${
          event.isRegistered
            ? "border border-border-subtle text-ink-primary hover:bg-white/[0.06]"
            : "bg-grad-purple-blue text-white shadow-glow-purple hover:opacity-90"
        }`}
      >
        {pending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : event.isRegistered ? (
          <Check size={14} />
        ) : null}
        {isPast ? "Подія завершилась" : event.isRegistered ? "Ви зареєстровані" : "Зареєструватися"}
      </button>
    </div>
  );
}
