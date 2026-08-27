import type { SupabaseClient } from "@supabase/supabase-js";

export type Livestream = {
  id: string;
  communityId: string;
  hostId: string;
  hostName: string;
  hostAvatarUrl: string | null;
  title: string;
  status: "live" | "ended";
  roomUrl: string | null;
  startedAt: string;
  endedAt: string | null;
};

const LIVESTREAM_SELECT =
  "id, community_id, host_id, title, status, room_url, started_at, ended_at, host:profiles!community_livestreams_host_id_fkey(full_name, avatar_url)";

type LivestreamRow = {
  id: string;
  community_id: string;
  host_id: string;
  title: string;
  status: "live" | "ended";
  room_url: string | null;
  started_at: string;
  ended_at: string | null;
  host: { full_name: string; avatar_url: string | null } | null;
};

function toLivestream(row: LivestreamRow): Livestream {
  return {
    id: row.id,
    communityId: row.community_id,
    hostId: row.host_id,
    hostName: row.host?.full_name ?? "Учасник ANEXA",
    hostAvatarUrl: row.host?.avatar_url ?? null,
    title: row.title,
    status: row.status,
    roomUrl: row.room_url,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

/** The community's current live session, if any (there's at most one —
 * starting a new one always ends the previous, see the /api/daily/rooms
 * POST handler). First asks the DB to auto-end any stream whose host has
 * stopped heartbeating (tab closed without clicking "Завершити ефір") —
 * a no-op for a genuinely live stream, so it's cheap to call on every load. */
export async function getActiveLivestream(supabase: SupabaseClient, communityId: string): Promise<Livestream | null> {
  const { error: staleError } = await supabase.rpc("end_stale_livestreams", { p_community_id: communityId });
  if (staleError) console.error("end_stale_livestreams failed:", staleError.message);

  const { data, error } = await supabase
    .from("community_livestreams")
    .select(LIVESTREAM_SELECT)
    .eq("community_id", communityId)
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getActiveLivestream failed:", error.message);
    return null;
  }

  return data ? toLivestream(data as unknown as LivestreamRow) : null;
}

/** Past (ended) sessions, most recent first — for the "Ефір" tab's history. */
export async function getPastLivestreams(supabase: SupabaseClient, communityId: string, limit = 10): Promise<Livestream[]> {
  const { data, error } = await supabase
    .from("community_livestreams")
    .select(LIVESTREAM_SELECT)
    .eq("community_id", communityId)
    .eq("status", "ended")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getPastLivestreams failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as LivestreamRow[]).map(toLivestream);
}

/** Creates the Daily.co room and the DB row via the server route — the
 * Daily API key is server-only, so this can't be a plain client insert
 * like the rest of this file's writes. */
export async function startLivestream(communityId: string, title: string): Promise<Livestream> {
  const res = await fetch("/api/daily/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ communityId, title }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? "Не вдалося розпочати ефір.");
  }

  return body.livestream as Livestream;
}

/** Called periodically by the host's own LivestreamPanel while their stream
 * is active — keeps last_heartbeat_at fresh so end_stale_livestreams never
 * mistakes a genuinely live session for an abandoned one. */
export async function pingLivestream(supabase: SupabaseClient, livestreamId: string): Promise<void> {
  const { error } = await supabase
    .from("community_livestreams")
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq("id", livestreamId);
  if (error) {
    console.error("pingLivestream failed:", error.message);
  }
}

export async function endLivestream(livestreamId: string): Promise<void> {
  const res = await fetch("/api/daily/rooms", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ livestreamId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Не вдалося завершити ефір.");
  }
}
