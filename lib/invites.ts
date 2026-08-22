import type { SupabaseClient } from "@supabase/supabase-js";

export type InviteCode = {
  code: string;
  createdAt: string;
  usedByName: string | null;
  usedAt: string | null;
};

type InviteCodeRow = {
  code: string;
  created_at: string;
  used_at: string | null;
  used_by_profile: { full_name: string } | null;
};

const INVITE_SELECT = "code, created_at, used_at, used_by_profile:profiles!invite_codes_used_by_fkey(full_name)";

/** All invite codes `userId` has generated — pending (shareable) and used
 * (a successful referral), newest first. */
export async function getMyInvites(supabase: SupabaseClient, userId: string): Promise<InviteCode[]> {
  const { data, error } = await supabase
    .from("invite_codes")
    .select(INVITE_SELECT)
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getMyInvites failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as InviteCodeRow[]).map((row) => ({
    code: row.code,
    createdAt: row.created_at,
    usedByName: row.used_by_profile?.full_name ?? null,
    usedAt: row.used_at,
  }));
}

function randomCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Generates a fresh single-use invite code owned by `userId`. Retries once
 * on the astronomically unlikely code collision (code is a primary key). */
export async function createInviteCode(supabase: SupabaseClient, userId: string): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const code = randomCode();
    const { error } = await supabase.from("invite_codes").insert({ code, created_by: userId });
    if (!error) return code;
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("Не вдалося згенерувати код запрошення. Спробуйте ще раз.");
}
