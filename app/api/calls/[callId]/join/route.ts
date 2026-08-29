import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mintMeetingToken, requireDailyApiKey } from "../../_daily";

const CALL_SELECT =
  "id, conversation_id, caller_id, callee_id, kind, status, room_url, room_name, started_at, answered_at, ended_at";

/**
 * The single choke point every entry into a call's Daily room goes
 * through -- first dial (caller, right after POST /api/calls), answering
 * (callee), or rejoining after a dropped connection (either side). Always
 * re-checks that the requester is actually caller_id or callee_id of this
 * specific row -- the real "participant of this call" authorization,
 * replacing the community-owner check app/api/daily/rooms/route.ts uses
 * for public livestream rooms.
 */
export async function POST(request: Request, { params }: { params: { callId: string } }) {
  const apiKey = requireDailyApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "DAILY_API_KEY не налаштовано в змінних оточення." }, { status: 500 });
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
    .select(CALL_SELECT)
    .eq("id", params.callId)
    .maybeSingle();

  if (!call) {
    return NextResponse.json({ error: "Дзвінок не знайдено." }, { status: 404 });
  }
  if (call.caller_id !== user.id && call.callee_id !== user.id) {
    return NextResponse.json({ error: "Ви не учасник цього дзвінка." }, { status: 403 });
  }
  if (["declined", "cancelled", "missed", "ended"].includes(call.status)) {
    return NextResponse.json({ error: "Дзвінок більше не активний." }, { status: 409 });
  }
  if (!call.room_name) {
    return NextResponse.json({ error: "Кімнату дзвінка не знайдено." }, { status: 500 });
  }

  let updated = call;
  if (call.status === "ringing" && call.callee_id === user.id) {
    const { data: activated } = await supabase
      .from("conversation_calls")
      .update({ status: "active", answered_at: new Date().toISOString() })
      .eq("id", call.id)
      .select(CALL_SELECT)
      .single();
    if (activated) updated = activated;
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  const token = await mintMeetingToken(
    apiKey,
    call.room_name,
    user.id,
    profile?.full_name ?? "Учасник ANEXA",
    user.id === call.caller_id
  );
  if (!token) {
    return NextResponse.json({ error: "Не вдалося створити токен для дзвінка." }, { status: 502 });
  }

  return NextResponse.json({ roomUrl: updated.room_url, token, call: updated });
}
