import type { SupabaseClient } from "@supabase/supabase-js";

/** Sends a connection request ("Познайомитися"). Duplicate requests are
 * rejected by the unique (requester_id, addressee_id) constraint. */
export async function requestConnection(
  supabase: SupabaseClient,
  requesterId: string,
  addresseeId: string
): Promise<void> {
  const { error } = await supabase
    .from("connections")
    .insert({ requester_id: requesterId, addressee_id: addresseeId });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Запит на знайомство вже надіслано.");
    }
    throw new Error(error.message);
  }
}

export type ConnectionRequester = {
  full_name: string;
  avatar_url: string | null;
  role_title: string | null;
  company: string | null;
  username: string | null;
};

export type IncomingConnectionRequest = {
  id: string;
  requester_id: string;
  created_at: string;
  requester: ConnectionRequester | null;
};

const REQUESTER_SELECT =
  "id, requester_id, created_at, requester:profiles!connections_requester_id_fkey(full_name, avatar_url, role_title, company, username)";

/** Pending requests someone else sent to `userId`, newest first. */
export async function getIncomingConnectionRequests(
  supabase: SupabaseClient,
  userId: string
): Promise<IncomingConnectionRequest[]> {
  const { data, error } = await supabase
    .from("connections")
    .select(REQUESTER_SELECT)
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getIncomingConnectionRequests failed:", error.message);
    return [];
  }

  return (data ?? []) as unknown as IncomingConnectionRequest[];
}

/** Count only — powers the sidebar badge without fetching full rows. */
export async function getIncomingConnectionCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("connections")
    .select("id", { count: "exact", head: true })
    .eq("addressee_id", userId)
    .eq("status", "pending");

  if (error) {
    console.error("getIncomingConnectionCount failed:", error.message);
    return 0;
  }

  return count ?? 0;
}

export type ConnectionState =
  | { status: "none" }
  | { status: "pending_sent" }
  | { status: "pending_received"; connectionId: string }
  | { status: "connected" };

/** Where things stand between `viewerId` and `targetId` — powers the
 * "Співпраця" button on a profile so it doesn't just fire duplicate
 * requests. At most two rows can exist for a pair (the unique constraint is
 * per-direction), so this never needs pagination. */
export async function getConnectionState(
  supabase: SupabaseClient,
  viewerId: string,
  targetId: string
): Promise<ConnectionState> {
  const { data, error } = await supabase
    .from("connections")
    .select("id, requester_id, status")
    .or(
      `and(requester_id.eq.${viewerId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${viewerId})`
    );

  if (error) {
    console.error("getConnectionState failed:", error.message);
    return { status: "none" };
  }

  const rows = (data ?? []) as { id: string; requester_id: string; status: string }[];

  if (rows.some((r) => r.status === "accepted")) {
    return { status: "connected" };
  }

  const sentByViewer = rows.find((r) => r.requester_id === viewerId && r.status === "pending");
  if (sentByViewer) {
    return { status: "pending_sent" };
  }

  const receivedFromTarget = rows.find((r) => r.requester_id === targetId && r.status === "pending");
  if (receivedFromTarget) {
    return { status: "pending_received", connectionId: receivedFromTarget.id };
  }

  return { status: "none" };
}

export type ViewerRelation = {
  following: boolean;
  blocked: boolean;
  reviewed: boolean;
  connection: ConnectionState;
};

/**
 * One round trip instead of four: replaces isFollowing + isUserBlocked +
 * getMyReviewOf + getConnectionState, which is what a profile page needs to
 * know about the viewer's relationship to the person it's showing. Backed
 * by the get_viewer_relation RPC (SECURITY INVOKER — it needs no elevated
 * privileges since every underlying table's own RLS already scopes rows to
 * viewerId when it's the caller's own auth.uid()).
 */
export async function getViewerRelation(
  supabase: SupabaseClient,
  viewerId: string,
  targetId: string
): Promise<ViewerRelation> {
  const { data, error } = await supabase.rpc("get_viewer_relation", {
    p_viewer_id: viewerId,
    p_target_id: targetId,
  });

  if (error) {
    console.error("getViewerRelation failed:", error.message);
    return { following: false, blocked: false, reviewed: false, connection: { status: "none" } };
  }

  const row = (
    data as
      | { following: boolean; blocked: boolean; reviewed: boolean; connection_status: string; connection_id: string | null }[]
      | null
  )?.[0];

  if (!row) {
    return { following: false, blocked: false, reviewed: false, connection: { status: "none" } };
  }

  const connection: ConnectionState =
    row.connection_status === "connected"
      ? { status: "connected" }
      : row.connection_status === "pending_sent"
        ? { status: "pending_sent" }
        : row.connection_status === "pending_received" && row.connection_id
          ? { status: "pending_received", connectionId: row.connection_id }
          : { status: "none" };

  return { following: row.following, blocked: row.blocked, reviewed: row.reviewed, connection };
}

export async function acceptConnection(supabase: SupabaseClient, connectionId: string): Promise<void> {
  const { error } = await supabase.from("connections").update({ status: "accepted" }).eq("id", connectionId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function declineConnection(supabase: SupabaseClient, connectionId: string): Promise<void> {
  const { error } = await supabase.from("connections").update({ status: "declined" }).eq("id", connectionId);
  if (error) {
    throw new Error(error.message);
  }
}
