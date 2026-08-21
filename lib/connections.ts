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
