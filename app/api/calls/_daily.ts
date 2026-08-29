const DAILY_API = "https://api.daily.co/v1";

/** Shared server-only Daily.co helpers for 1:1 calls (app/api/calls/*).
 * Kept separate from app/api/daily/rooms/route.ts because that route's
 * rooms are public/tokenless (community livestreams) while calls need
 * private rooms + per-participant meeting tokens. */

export function requireDailyApiKey(): string | null {
  return process.env.DAILY_API_KEY ?? null;
}

export async function createPrivateRoom(
  apiKey: string,
  roomName: string,
  startVideoOff: boolean
): Promise<{ name: string; url: string } | null> {
  const res = await fetch(`${DAILY_API}/rooms`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: { enable_chat: false, start_video_off: startVideoOff },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Daily private room creation failed:", res.status, detail);
    return null;
  }
  return (await res.json()) as { name: string; url: string };
}

export async function mintMeetingToken(
  apiKey: string,
  roomName: string,
  userId: string,
  userName: string,
  isOwner: boolean
): Promise<string | null> {
  const res = await fetch(`${DAILY_API}/meeting-tokens`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        user_name: userName,
        is_owner: isOwner,
        exp: Math.floor(Date.now() / 1000) + 4 * 60 * 60,
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Daily meeting token creation failed:", res.status, detail);
    return null;
  }
  const body = (await res.json()) as { token: string };
  return body.token;
}

export async function deleteRoom(apiKey: string, roomName: string): Promise<void> {
  await fetch(`${DAILY_API}/rooms/${roomName}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  }).catch(() => undefined);
}
