import type { SupabaseClient } from "@supabase/supabase-js";

export type PendingProfile = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  roleTitle: string | null;
  company: string | null;
  createdAt: string;
};

/** Members whose closed-beta profile hasn't been approved yet, oldest
 * signup first. Plain table select — `profiles` is readable by any
 * authenticated user, only the approve action itself is admin-gated. */
export async function getPendingProfiles(supabase: SupabaseClient): Promise<PendingProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role_title, company, created_at")
    .eq("is_approved", false)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getPendingProfiles failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    roleTitle: row.role_title,
    company: row.company,
    createdAt: row.created_at,
  }));
}

/** Marks a member's profile approved. Server-side checks the caller is a
 * platform admin (via RLS-bypassing RPC) — the client-side gate on the page
 * is only a convenience, not the real access control. */
export async function approveProfile(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase.rpc("approve_profile", { p_user_id: userId });
  if (error) {
    throw new Error(error.message);
  }
}
