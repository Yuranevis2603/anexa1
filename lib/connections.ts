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
