import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPrivateRoom, deleteRoom, mintMeetingToken, requireDailyApiKey } from "./_daily";

const CALL_SELECT =
  "id, conversation_id, caller_id, callee_id, kind, status, room_url, room_name, started_at, answered_at, ended_at";

/**
 * Starts (POST) or cancels/declines/ends (DELETE) a 1:1 call between the
 * two participants of a conversation. Unlike app/api/daily/rooms/route.ts
 * (public livestream rooms, no auth beyond "is the community owner"), this
 * mints a private Daily room and a meeting token scoped to the two actual
 * conversation participants -- resolved server-side from
 * conversation_participants, never trusted from the request body.
 */
export async function POST(request: Request) {
  const apiKey = requireDailyApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "DAILY_API_KEY не налаштовано в змінних оточення." }, { status: 500 });
  }

  const { conversationId, kind } = (await request.json()) as {
    conversationId?: string;
    kind?: "audio" | "video";
  };
  if (!conversationId || (kind !== "audio" && kind !== "video")) {
    return NextResponse.json({ error: "Потрібні conversationId і kind." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const { data: participants } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId);

  const ids = (participants ?? []).map((p) => p.user_id);
  if (!ids.includes(user.id)) {
    return NextResponse.json({ error: "Ви не учасник цієї розмови." }, { status: 403 });
  }
  const calleeId = ids.find((id) => id !== user.id);
  if (!calleeId) {
    return NextResponse.json({ error: "Не знайдено співрозмовника." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("conversation_calls")
    .select(CALL_SELECT)
    .eq("conversation_id", conversationId)
    .in("status", ["ringing", "active"])
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Дзвінок уже триває.", call: existing }, { status: 409 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const roomName = `call-${conversationId}-${Date.now()}`;
  const room = await createPrivateRoom(apiKey, roomName, kind === "audio");
  if (!room) {
    return NextResponse.json({ error: "Не вдалося створити кімнату для дзвінка." }, { status: 502 });
  }

  const token = await mintMeetingToken(apiKey, room.name, user.id, callerProfile?.full_name ?? "Учасник ANEXA", true);
  if (!token) {
    await deleteRoom(apiKey, room.name);
    return NextResponse.json({ error: "Не вдалося створити токен для дзвінка." }, { status: 502 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("conversation_calls")
    .insert({
      conversation_id: conversationId,
      caller_id: user.id,
      callee_id: calleeId,
      kind,
      status: "ringing",
      room_url: room.url,
      room_name: room.name,
    })
    .select(CALL_SELECT)
    .single();

  if (insertError || !inserted) {
    console.error("conversation_calls insert failed:", insertError?.message);
    await deleteRoom(apiKey, room.name);
    return NextResponse.json({ error: "Не вдалося зберегти дзвінок." }, { status: 500 });
  }

  return NextResponse.json({ call: inserted, token });
}

export async function DELETE(request: Request) {
  const apiKey = requireDailyApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "DAILY_API_KEY не налаштовано в змінних оточення." }, { status: 500 });
  }

  const { callId, status } = (await request.json()) as {
    callId?: string;
    status?: "cancelled" | "declined" | "ended";
  };
  if (!callId || !["cancelled", "declined", "ended"].includes(status ?? "")) {
    return NextResponse.json({ error: "Потрібні callId і статус." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const { data: call } = await supabase
    .from("conversation_calls")
    .select("id, caller_id, callee_id, room_name, status")
    .eq("id", callId)
    .maybeSingle();

  if (!call || (call.caller_id !== user.id && call.callee_id !== user.id)) {
    return NextResponse.json({ error: "Ви не учасник цього дзвінка." }, { status: 403 });
  }

  if (["declined", "cancelled", "missed", "ended"].includes(call.status)) {
    return NextResponse.json({ ok: true });
  }

  if (call.room_name) {
    await deleteRoom(apiKey, call.room_name);
  }

  const { error: updateError } = await supabase
    .from("conversation_calls")
    .update({ status, ended_at: new Date().toISOString() })
    .eq("id", callId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
