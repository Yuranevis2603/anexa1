import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Lands here after Google OAuth redirects back from Supabase. Exchanges
 * the PKCE code for a session, then — for a fresh signup that came through
 * the register view's "Продовжити з Google" (an `invite` param is present
 * only there, never on a plain login) — credits the invite code the same
 * way handle_new_user() does for the email flow, via consume_invite_code().
 * See lib/onboarding.ts / app/dashboard/layout.tsx for what happens next:
 * a first-time signup lands on /onboarding, a returning member on /dashboard. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const invite = searchParams.get("invite");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (invite) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { error: consumeError } = await supabase.rpc("consume_invite_code", { p_code: invite });
          if (consumeError) {
            console.error("consume_invite_code failed:", consumeError.message);
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
