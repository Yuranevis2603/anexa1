import { cache } from "react";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

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
