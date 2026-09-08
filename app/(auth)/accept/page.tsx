import { AcceptInvite } from "@/components/auth/AcceptInvite";

/**
 * Landing page for invite / recovery emails.
 *
 * This has to be a client page. `inviteUserByEmail` is generated server-side
 * by the admin API, so the invitee's browser never stored a PKCE verifier —
 * Supabase therefore hands the session back in the URL *fragment*
 * (`#access_token=…&refresh_token=…`), and a fragment is never sent to the
 * server. The old server-only callback saw no `?code=`, judged the link
 * invalid and bounced people to /login with no password ever set.
 */
export default function AcceptInvitePage() {
  return <AcceptInvite />;
}
