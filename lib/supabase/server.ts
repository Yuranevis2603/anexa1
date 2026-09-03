import { cache } from "react";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

/** React.cache() scopes this to one memoized instance per request — every
 * Server Component in a route's layout+page tree calls createClient()
 * independently, so without this each got its own client (and, more
 * importantly, data-fetching helpers wrapped in cache() couldn't dedupe
 * since the `supabase` argument would differ by reference every call). */
export const createClient = cache(function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
});

/** React.cache()-memoized auth.getUser() — a route's layout and page both
 * need "who's signed in" in the same request (e.g. app/dashboard/layout.tsx
 * + app/dashboard/page.tsx each called supabase.auth.getUser() separately).
 * Takes the already-cache()-wrapped createClient()'s client as its arg so
 * the memoization key matches across call sites in the same request. */
export const getCachedUser = cache(async function getCachedUser(
  supabase: ReturnType<typeof createClient>
): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
