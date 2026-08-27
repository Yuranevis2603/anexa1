import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "connection_request"
  | "connection_accepted"
  | "message"
  | "review"
  | "referral_joined"
  | "profile_approved";

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
    case "referral_joined":
      return { text: `${actor} приєднався(лась) за вашим запрошенням`, href: "/dashboard/profile?tab=info" };
    case "profile_approved":
      return { text: "Ваш профіль підтверджено модератором", href: "/dashboard/profile" };
  }
}

/** Ukrainian label for each notification type's Settings toggle. */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  like: "Лайки на моїх постах",
  comment: "Коментарі на моїх постах",
  follow: "Нові підписники",
  connection_request: "Запити на знайомство",
  connection_accepted: "Прийняті запити на знайомство",
  message: "Нові повідомлення",
  review: "Нові відгуки",
  referral_joined: "Приєднання за моїм запрошенням",
  profile_approved: "Підтвердження профілю",
};

/** Which notification types `userId` opted out of. Missing row = none (all enabled). */
export async function getDisabledNotificationTypes(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationType[]> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("disabled_types")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getDisabledNotificationTypes failed:", error.message);
    return [];
  }

  return (data?.disabled_types ?? []) as NotificationType[];
}

/** Enables/disables one notification type, upserting the preferences row. */
export async function setNotificationTypeEnabled(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  enabled: boolean,
  currentlyDisabled: NotificationType[]
): Promise<NotificationType[]> {
  const next = enabled
    ? currentlyDisabled.filter((t) => t !== type)
    : currentlyDisabled.includes(type)
      ? currentlyDisabled
      : [...currentlyDisabled, type];

  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: userId, disabled_types: next, updated_at: new Date().toISOString() });

  if (error) {
    throw new Error(error.message);
  }
  return next;
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
