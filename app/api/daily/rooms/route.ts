import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DAILY_API = "https://api.daily.co/v1";

/**
 * Creates (POST) or tears down (DELETE) a Daily.co room backing a
 * community's "Ефір" tab. Lives server-side because it needs DAILY_API_KEY
 * (a secret — never exposed to the client) to call Daily's REST API.
 * Rooms are created `privacy: "public"`: anyone with the room_url can join
 * directly via an <iframe>, no per-viewer meeting token needed — the
 * simplest shape for a v1 with no admin/moderator roles yet to gate who
 * gets a "viewer" vs "host" token.
 */
export async function POST(request: Request) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DAILY_API_KEY не налаштовано в змінних оточення." },
      { status: 500 }
    );
  }

  const { communityId, title } = (await request.json()) as { communityId?: string; title?: string };
  if (!communityId || !title?.trim()) {
    return NextResponse.json({ error: "Потрібні communityId і title." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id, created_by")
    .eq("id", communityId)
    .maybeSingle();
  if (!community || community.created_by !== user.id) {
    return NextResponse.json({ error: "Лише власник спільноти може почати ефір." }, { status: 403 });
  }

  // Starting a new stream always ends whatever was live before.
  const { data: previous } = await supabase
    .from("community_livestreams")
    .select("id, room_name")
    .eq("community_id", communityId)
    .eq("status", "live");
  for (const stream of previous ?? []) {
    if (stream.room_name) {
      await fetch(`${DAILY_API}/rooms/${stream.room_name}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      }).catch(() => undefined);
    }
    await supabase
      .from("community_livestreams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", stream.id);
  }

  const roomName = `community-${communityId}-${Date.now()}`;
  const dailyRes = await fetch(`${DAILY_API}/rooms`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: roomName,
      privacy: "public",
      properties: { enable_chat: true, start_video_off: true },
    }),
  });

  if (!dailyRes.ok) {
    const detail = await dailyRes.text().catch(() => "");
    console.error("Daily room creation failed:", dailyRes.status, detail);
    return NextResponse.json({ error: "Не вдалося створити кімнату для ефіру." }, { status: 502 });
  }

  const room = (await dailyRes.json()) as { name: string; url: string };

  const { data: inserted, error: insertError } = await supabase
    .from("community_livestreams")
    .insert({
      community_id: communityId,
      host_id: user.id,
      title: title.trim(),
      status: "live",
      room_url: room.url,
      room_name: room.name,
    })
    .select(
      "id, community_id, host_id, title, status, room_url, started_at, ended_at, host:profiles!community_livestreams_host_id_fkey(full_name, avatar_url)"
    )
    .single();

  if (insertError || !inserted) {
    console.error("community_livestreams insert failed:", insertError?.message);
    return NextResponse.json({ error: "Не вдалося зберегти ефір." }, { status: 500 });
  }

  const row = inserted as unknown as {
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

  return NextResponse.json({
    livestream: {
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
    },
  });
}

export async function DELETE(request: Request) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DAILY_API_KEY не налаштовано в змінних оточення." },
      { status: 500 }
    );
  }

  const { livestreamId } = (await request.json()) as { livestreamId?: string };
  if (!livestreamId) {
    return NextResponse.json({ error: "Потрібен livestreamId." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const { data: stream } = await supabase
    .from("community_livestreams")
    .select("id, host_id, room_name, status")
    .eq("id", livestreamId)
    .maybeSingle();

  if (!stream || stream.host_id !== user.id) {
    return NextResponse.json({ error: "Лише ведучий може завершити ефір." }, { status: 403 });
  }

  if (stream.status === "ended") {
    return NextResponse.json({ ok: true });
  }

  if (stream.room_name) {
    await fetch(`${DAILY_API}/rooms/${stream.room_name}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    }).catch(() => undefined);
  }

  const { error: updateError } = await supabase
    .from("community_livestreams")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", livestreamId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
