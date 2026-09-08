import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Supabase invite / magic-link / password-reset PKCE redirect target.
 * Exchanges the one-time `code` for a session (setting cookies via the
 * server client), then sends the user to finish setup or straight in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/set-password";

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // The link was invalid or expired. If someone else is still signed in on
  // this browser (an admin who sent the invite, say), leaving that session
  // intact silently drops the invitee into the admin's dashboard instead of
  // telling them the link failed — so clear it first.
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login?error=invalid_link", origin));
}
