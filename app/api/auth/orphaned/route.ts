import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Escape hatch for a valid Supabase session whose PerformIQ member no longer
 * exists — someone removed from the org, or an account created before its
 * Member row was linked.
 *
 * Without this the app deadlocks: the dashboard layout can't resolve a member
 * so it redirects to /login, and proxy.ts sees a still-valid auth session on
 * an auth route and redirects straight back to /dashboard — an infinite
 * bounce that never renders a page, with no way to reach the login form and
 * sign in as someone else. A Server Component can't clear cookies, so the
 * layout sends the browser here instead: this route CAN, and once the session
 * is gone the proxy stops bouncing and /login renders normally.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login?error=no_profile", request.nextUrl.origin));
}
