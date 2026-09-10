import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Sliding-window rate limiter for sensitive, unauthenticated-or-cheap-to-spam
 * actions (login, invite, lesson-request submit, Odoo lookup). Falls back to
 * an always-allow no-op limiter when Upstash isn't configured, so local dev
 * without Redis still works — but this must be configured before production
 * deploy (see .env.example).
 */
/**
 * A truthiness check is not enough: `vercel env pull` writes the literal
 * string "[SENSITIVE]" for variables marked sensitive, and the Upstash
 * client throws on a non-https URL at module load -- which takes down every
 * action that imports this file, including login. Validate the shape so a
 * bad value degrades to "no rate limiting" (and says so) instead of
 * breaking authentication outright.
 */
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const upstashConfigured = Boolean(
  upstashUrl?.startsWith("https://") && upstashToken && upstashToken !== "[SENSITIVE]",
);

if (upstashUrl && !upstashConfigured) {
  console.warn(
    "Rate limiting disabled: UPSTASH_REDIS_REST_URL/TOKEN are set but not usable " +
      "(expected an https URL). Check the values in this environment.",
  );
}

const redis = upstashConfigured
  ? new Redis({ url: upstashUrl!, token: upstashToken! })
  : null;

function makeLimiter(tokens: number, window: `${number} ${"s" | "m" | "h"}`) {
  if (!redis) {
    if (process.env.NODE_ENV === "production") {
      console.warn("Rate limiting disabled: UPSTASH_REDIS_REST_URL/TOKEN not set.");
    }
    return { limit: async () => ({ success: true, remaining: tokens }) };
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
  });
}

export const loginRateLimit = makeLimiter(10, "1 m");
export const inviteRateLimit = makeLimiter(20, "1 h");
// Deliberately tighter than login: a reset request sends mail to a third
// party, so spamming it is a way to harass someone else's inbox.
export const passwordResetRateLimit = makeLimiter(5, "15 m");
export const lessonRequestRateLimit = makeLimiter(10, "1 h");
export const odooLookupRateLimit = makeLimiter(30, "1 m");

/** Keyed by the caller-provided identifier (IP, email, or memberId). */
export async function checkRateLimit(
  limiter: { limit: (key: string) => Promise<{ success: boolean; remaining: number }> },
  key: string,
) {
  const { success } = await limiter.limit(key);
  if (!success) {
    throw new Error("Too many attempts. Please wait a moment and try again.");
  }
}
