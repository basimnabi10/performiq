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
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
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
