import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Smart per-profile QR/link target: anexa.club/u/<referral_code>. Signed-in
 * visitors land straight on the code owner's profile (app/dashboard/people/[id]
 * already handles a viewer's own id fine, no special-casing needed); signed-out
 * visitors go through the existing referral registration flow, unchanged.
 */
export async function GET(request: Request, { params }: { params: { code: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(`/register?invite=${params.code}`, request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", params.code)
    .maybeSingle();

  if (!profile) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.redirect(new URL(`/dashboard/people/${profile.id}`, request.url));
}
