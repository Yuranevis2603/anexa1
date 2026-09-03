import type { SupabaseClient } from "@supabase/supabase-js";

export type EventStatus = "draft" | "published";

export type EventItem = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  eventDate: string;
  createdBy: string | null;
  communityId: string | null;
  status: EventStatus;
  attendeeCount: number;
  isRegistered: boolean;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  created_by: string | null;
  community_id: string | null;
  status: EventStatus;
};

const EVENT_COLUMNS = "id, title, description, location, event_date, created_by, community_id, status";

/** All events (optionally scoped to one community) with an attendee count
 * and whether `userId` is registered. Registrations are scoped to the
 * fetched events via `.in()` (same pattern as getUserLikes/getUserSaves)
 * instead of reading the entire event_registrations table. */
export async function getEvents(
  supabase: SupabaseClient,
  userId: string,
  communityId?: string,
  /** Community staff viewing the admin panel also need to see drafts. */
  includeDrafts = false
): Promise<EventItem[]> {
  let query = supabase.from("events").select(EVENT_COLUMNS).order("event_date", { ascending: true });
  if (communityId) {
    query = query.eq("community_id", communityId);
  }
  if (!includeDrafts) {
    query = query.eq("status", "published");
  }

  const { data: events, error: eventsError } = await query;

  if (eventsError) {
    console.error("getEvents failed:", eventsError.message);
    return [];
  }

  const eventRows = (events ?? []) as EventRow[];
  const eventIds = eventRows.map((e) => e.id);

  const { data: regs, error: regsError } =
    eventIds.length > 0
      ? await supabase
          .from("event_registrations")
          .select("event_id, user_id")
          .in("event_id", eventIds)
          .neq("status", "cancelled")
      : { data: [] as { event_id: string; user_id: string }[], error: null };

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

  return eventRows.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    eventDate: e.event_date,
    createdBy: e.created_by,
    communityId: e.community_id,
    status: e.status,
    attendeeCount: counts.get(e.id) ?? 0,
    isRegistered: mine.has(e.id),
  }));
}

/** The single soonest upcoming event `userId` is registered for — for the
 * dashboard overview tile, which only needs one event, not the whole
 * platform's event list. Uses the existing idx_event_registrations_user_id
 * index and Postgrest's embedded-resource filtering to do it in one
 * round trip. */
export async function getNextRegisteredEvent(supabase: SupabaseClient, userId: string): Promise<EventItem | null> {
  const { data, error } = await supabase
    .from("event_registrations")
    .select(`event_id, events!inner(${EVENT_COLUMNS})`)
    .eq("user_id", userId)
    .neq("status", "cancelled")
    .eq("events.status", "published")
    .gte("events.event_date", new Date().toISOString())
    .order("event_date", { foreignTable: "events", ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getNextRegisteredEvent failed:", error.message);
    return null;
  }
  if (!data) return null;

  const e = (data as unknown as { events: EventRow }).events;
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    eventDate: e.event_date,
    createdBy: e.created_by,
    communityId: e.community_id,
    status: e.status,
    attendeeCount: 0,
    isRegistered: true,
  };
}

/** Creates an event owned by `userId` (optionally scoped to a community)
 * and registers its creator right away. */
export async function createEvent(
  supabase: SupabaseClient,
  userId: string,
  fields: {
    title: string;
    description: string | null;
    location: string | null;
    eventDate: string;
    communityId?: string | null;
    status?: EventStatus;
  }
): Promise<EventItem> {
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: fields.title,
      description: fields.description,
      location: fields.location,
      event_date: fields.eventDate,
      created_by: userId,
      community_id: fields.communityId ?? null,
      status: fields.status ?? "published",
    })
    .select(EVENT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const event = data as EventRow;

  await registerForEvent(supabase, userId, event.id);

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    eventDate: event.event_date,
    createdBy: event.created_by,
    communityId: event.community_id,
    status: event.status,
    attendeeCount: 1,
    isRegistered: true,
  };
}

/** Owner/creator or the community's owner/admin — RLS (events_update_own /
 * events_manage_community_admins) enforces it. */
export async function updateEvent(
  supabase: SupabaseClient,
  eventId: string,
  fields: { title: string; description: string | null; location: string | null; eventDate: string; status: EventStatus }
): Promise<void> {
  const { error } = await supabase
    .from("events")
    .update({
      title: fields.title,
      description: fields.description,
      location: fields.location,
      event_date: fields.eventDate,
      status: fields.status,
    })
    .eq("id", eventId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteEvent(supabase: SupabaseClient, eventId: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) {
    throw new Error(error.message);
  }
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
