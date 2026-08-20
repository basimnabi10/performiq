import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS entirely and can perform
 * admin operations (inviteUserByEmail, etc). SUPABASE_SERVICE_ROLE_KEY must
 * never reach the client bundle; the `server-only` import enforces that at
 * build time (importing this file from a Client Component fails the build).
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
