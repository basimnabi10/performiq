import { createSafeActionClient } from "next-safe-action";
import { AuthzError, getCurrentMember } from "@/lib/authz";

/**
 * Base action client — every Server Action in actions/* is built from one
 * of these two, so auth + error shaping is enforced centrally rather than
 * ad hoc per file.
 */
export const actionClient = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof AuthzError) return e.message;
    console.error("Server action error:", e);
    return "Something went wrong. Please try again.";
  },
});

/** Action client that requires an authenticated, linked Member. */
export const authActionClient = actionClient.use(async ({ next }) => {
  const member = await getCurrentMember();
  return next({ ctx: { member } });
});
