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

/**
 * Finds an auth user by email. The admin API has no lookup-by-email, only
 * paginated listing, so this pages through until it finds a match.
 *
 * Needed because auth users outlive their PerformIQ member row: removing
 * someone from the org (or resetting the app's data) deletes the Member but
 * leaves the Supabase account, and re-inviting that address then fails with
 * `email_exists`. Finding the existing account lets us re-link instead.
 */
export async function findAuthUserByEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
): Promise<{ id: string; email?: string } | null> {
  const needle = email.trim().toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email?.toLowerCase() === needle);
    if (hit) return { id: hit.id, email: hit.email ?? undefined };
    if (data.users.length < perPage) break;
  }
  return null;
}
