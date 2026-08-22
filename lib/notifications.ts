import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "connection_request"
  | "connection_accepted"
  | "message"
  | "review";

export type Notification = {
  id: string;
  type: NotificationType;
  entityType: string | null;
  entityId: string | null;
  actorId: string | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  type: NotificationType;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: { full_name: string; avatar_url: string | null } | null;
};

const NOTIFICATION_SELECT =
  "id, type, entity_type, entity_id, actor_id, read_at, created_at, actor:profiles!notifications_actor_id_fkey(full_name, avatar_url)";

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorId: row.actor_id,
    actorName: row.actor?.full_name ?? null,
    actorAvatarUrl: row.actor?.avatar_url ?? null,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/** Most recent notifications for `userId`, newest first. */
export async function getNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 20
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getNotifications failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => toNotification(row as unknown as NotificationRow));
}

/** Count only — powers the bell badge without fetching full rows. */
export async function getUnreadNotificationCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("getUnreadNotificationCount failed:", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function markNotificationRead(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) {
    throw new Error(error.message);
  }
}

export async function markAllNotificationsRead(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) {
    throw new Error(error.message);
  }
}

/** Where a notification should link to, and its display text. Text avoids
 * gendered verb forms (Ukrainian past tense needs the actor's gender, which
 * profiles don't track) by phrasing everything as a noun phrase. */
export function describeNotification(n: Notification): { text: string; href: string } {
  const actor = n.actorName ?? "Хтось";
  switch (n.type) {
    case "like":
      return { text: `Лайк від ${actor}`, href: n.entityId ? `/dashboard/post/${n.entityId}` : "/dashboard" };
    case "comment":
      return {
        text: `Новий коментар від ${actor}`,
        href: n.entityId ? `/dashboard/post/${n.entityId}?comments=1` : "/dashboard",
      };
    case "follow":
      return { text: `Новий підписник: ${actor}`, href: n.actorId ? `/dashboard/people/${n.actorId}` : "/dashboard" };
    case "connection_request":
      return { text: `Запит на знайомство від ${actor}`, href: "/dashboard/friends?tab=requests" };
    case "connection_accepted":
      return { text: `${actor} прийняв(ла) запит на знайомство`, href: "/dashboard/friends" };
    case "message":
      return {
        text: `Нове повідомлення від ${actor}`,
        href: n.entityId ? `/dashboard/messages?c=${n.entityId}` : "/dashboard/messages",
      };
    case "review":
      return { text: `Новий відгук від ${actor}`, href: "/dashboard/profile?tab=info" };
  }
}

/** Ukrainian relative time for a notification row, e.g. "5 хв тому". */
export function formatNotificationTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "щойно";
  if (minutes < 60) return `${minutes} хв тому`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн тому`;
  return new Date(iso).toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
}
