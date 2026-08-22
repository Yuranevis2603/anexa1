import type { SupabaseClient } from "@supabase/supabase-js";

export type EventItem = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  eventDate: string;
  createdBy: string | null;
  attendeeCount: number;
  isRegistered: boolean;
};

/** All events with an attendee count and whether `userId` is registered.
 * Both tables are select-all for authenticated members (see schema.sql),
 * so this is two plain reads plus a client-side aggregation — same
 * approach as getCommunities. */
export async function getEvents(supabase: SupabaseClient, userId: string): Promise<EventItem[]> {
  const [{ data: events, error: eventsError }, { data: regs, error: regsError }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, description, location, event_date, created_by")
      .order("event_date", { ascending: true }),
    supabase.from("event_registrations").select("event_id, user_id").neq("status", "cancelled"),
  ]);

  if (eventsError) {
    console.error("getEvents failed:", eventsError.message);
    return [];
  }
  if (regsError) {
    console.error("getEvents (registrations) failed:", regsError.message);
  }

  const rows = (regs ?? []) as { event_id: string; user_id: string }[];
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const row of rows) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
    if (row.user_id === userId) mine.add(row.event_id);
  }

  return (
    (events ?? []) as {
      id: string;
      title: string;
      description: string | null;
      location: string | null;
      event_date: string;
      created_by: string | null;
    }[]
  ).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    eventDate: e.event_date,
    createdBy: e.created_by,
    attendeeCount: counts.get(e.id) ?? 0,
    isRegistered: mine.has(e.id),
  }));
}

/** Creates an event owned by `userId` and registers its creator right away. */
export async function createEvent(
  supabase: SupabaseClient,
  userId: string,
  fields: { title: string; description: string | null; location: string | null; eventDate: string }
): Promise<EventItem> {
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: fields.title,
      description: fields.description,
      location: fields.location,
      event_date: fields.eventDate,
      created_by: userId,
    })
    .select("id, title, description, location, event_date, created_by")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const event = data as {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    event_date: string;
    created_by: string | null;
  };

  await registerForEvent(supabase, userId, event.id);

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    eventDate: event.event_date,
    createdBy: event.created_by,
    attendeeCount: 1,
    isRegistered: true,
  };
}

export async function registerForEvent(supabase: SupabaseClient, userId: string, eventId: string): Promise<void> {
  const { error } = await supabase.from("event_registrations").insert({ event_id: eventId, user_id: userId });
  if (error) {
    throw new Error(error.message);
  }
}

export async function cancelRegistration(supabase: SupabaseClient, userId: string, eventId: string): Promise<void> {
  const { error } = await supabase
    .from("event_registrations")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
}

/** Ukrainian date/time for an event card, e.g. "22 серпня, 14:00". */
export function formatEventDate(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
  const timePart = date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}
