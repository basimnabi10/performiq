import { createSafeActionClient } from "next-safe-action";
import { AuthzError, getCurrentMember } from "@/lib/authz";

/**
 * Base action client — every Server Action in actions/* is built from one
 * of these two, so auth + error shaping is enforced centrally rather than
 * ad hoc per file.
 *
 * Every action in this codebase throws plain `Error`s with deliberately
 * human-readable, safe-to-display messages (e.g. "Incorrect email or
 * password.") -- internal/sensitive detail (like the real Supabase error)
 * is always logged separately via console.error at the throw site, never
 * embedded in the message itself. So it's safe to surface any Error's
 * message here, not just AuthzError's. Every error is also logged
 * server-side regardless of type, so nothing is silently swallowed.
 */
export const actionClient = createSafeActionClient({
  handleServerError(e) {
    console.error("Server action error:", e);
    if (e instanceof AuthzError) return e.message;
    if (e instanceof Error) return e.message;
    return "Something went wrong. Please try again.";
  },
});

/** Action client that requires an authenticated, linked Member. */
export const authActionClient = actionClient.use(async ({ next }) => {
  const member = await getCurrentMember();
  return next({ ctx: { member } });
});
