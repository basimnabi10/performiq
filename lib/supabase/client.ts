import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components. Used only for auth (sign-in,
 * sign-out, password reset) — never for application data.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
