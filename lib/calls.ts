import type { SupabaseClient } from "@supabase/supabase-js";

export type CallStatus = "ringing" | "active" | "declined" | "cancelled" | "missed" | "ended";
export type CallKind = "audio" | "video";

export type Call = {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  kind: CallKind;
  status: CallStatus;
  roomUrl: string | null;
  roomName: string | null;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
};

export type CallRow = {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  kind: CallKind;
  status: CallStatus;
  room_url: string | null;
  room_name: string | null;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
};

export function toCall(row: CallRow): Call {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    callerId: row.caller_id,
    calleeId: row.callee_id,
    kind: row.kind,
    status: row.status,
    roomUrl: row.room_url,
    roomName: row.room_name,
    startedAt: row.started_at,
    answeredAt: row.answered_at,
    endedAt: row.ended_at,
  };
}

const ACTIVE_CALL_SELECT =
  "id, conversation_id, caller_id, callee_id, kind, status, room_url, room_name, started_at, answered_at, ended_at";

/** Direct re-fetch of one call's current row, bypassing Realtime entirely --
 * a lightweight safety net CallProvider polls on top of the postgres_changes
 * subscription, since a backgrounded mobile tab can miss a WebSocket event
 * during a brief reconnect and would otherwise be stuck showing a stale
 * status (e.g. still "ringing" after the other side already answered). */
export async function getCallById(supabase: SupabaseClient, callId: string): Promise<Call | null> {
  const { data, error } = await supabase.from("conversation_calls").select(ACTIVE_CALL_SELECT).eq("id", callId).maybeSingle();

  if (error) {
    console.error("getCallById failed:", error.message);
    return null;
  }
  return data ? toCall(data as unknown as CallRow) : null;
}

/** Any ringing/active call where I'm a participant -- used by CallProvider
 * to recover in-flight call state after a refresh or reconnect. First runs
 * end_stale_calls() (cheap no-op most of the time, same call-site rationale
 * as getActiveLivestream's pre-query). */
export async function getMyActiveCall(supabase: SupabaseClient, userId: string): Promise<Call | null> {
  const { error: staleError } = await supabase.rpc("end_stale_calls");
  if (staleError) console.error("end_stale_calls failed:", staleError.message);

  const { data, error } = await supabase
    .from("conversation_calls")
    .select(ACTIVE_CALL_SELECT)
    .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
    .in("status", ["ringing", "active"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getMyActiveCall failed:", error.message);
    return null;
  }
  return data ? toCall(data as unknown as CallRow) : null;
}

/** Starts a call via the server route (needs DAILY_API_KEY, server-only).
 * Returns the call row plus a Daily meeting token for the caller. */
export async function startCall(
  conversationId: string,
  kind: CallKind
): Promise<{ call: Call; token: string }> {
  const res = await fetch("/api/calls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, kind }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? "Не вдалося розпочати дзвінок.");
  }
  return { call: toCall(body.call as CallRow), token: body.token as string };
}

/** Mints a token to enter the room -- answering, or rejoining after a
 * dropped connection. Answering (callee, status "ringing") flips the call
 * to "active" server-side as a side effect. */
export async function joinCall(callId: string): Promise<{ roomUrl: string; token: string; call: Call }> {
  const res = await fetch(`/api/calls/${callId}/join`, { method: "POST" });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? "Не вдалося приєднатися до дзвінка.");
  }
  return { roomUrl: body.roomUrl as string, token: body.token as string, call: toCall(body.call as CallRow) };
}

async function updateCallStatus(callId: string, status: "cancelled" | "declined" | "ended"): Promise<void> {
  const res = await fetch("/api/calls", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callId, status }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Не вдалося оновити дзвінок.");
  }
}

/** Caller gave up before the callee picked up. */
export const cancelCall = (callId: string) => updateCallStatus(callId, "cancelled");
/** Callee rejected an incoming call. */
export const declineCall = (callId: string) => updateCallStatus(callId, "declined");
/** Either side hung up an active call. */
export const endCall = (callId: string) => updateCallStatus(callId, "ended");

/** Called periodically by whoever is actively in the call -- keeps
 * last_heartbeat_at fresh so end_stale_calls() never mistakes a genuinely
 * ongoing call for an abandoned one. Same shape as pingLivestream. */
export async function pingCall(supabase: SupabaseClient, callId: string): Promise<void> {
  const { error } = await supabase
    .from("conversation_calls")
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq("id", callId);
  if (error) {
    console.error("pingCall failed:", error.message);
  }
}
