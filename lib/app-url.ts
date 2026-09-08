import "server-only";

import { headers } from "next/headers";

/**
 * The origin to build absolute links on (invite emails, auth callbacks).
 *
 * Deliberately does NOT just trust NEXT_PUBLIC_APP_URL: that variable is
 * `http://localhost:3000` in .env.local, and copying that value into the
 * hosting environment silently emails production invitees a link to their
 * own machine. A localhost value is therefore ignored anywhere it isn't
 * actually being served from localhost.
 *
 * Order:
 *   1. NEXT_PUBLIC_APP_URL, when it's a real (non-localhost) origin — the
 *      explicit override, e.g. once a custom domain exists.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — set by Vercel to the stable production
 *      domain, so invites sent from a preview build still point at prod.
 *   3. VERCEL_URL — this specific deployment, if the above is unavailable.
 *   4. The request's own host — how local dev resolves.
 *
 * The request host is last on purpose: the Host header is client-controlled,
 * and putting it first would let a spoofed host mint invite links to another
 * domain. (Supabase's redirect allowlist is a second line of defence, but
 * this shouldn't depend on that.)
 */
export async function getAppBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(configured)) {
    return configured.replace(/\/+$/, "");
  }

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost.replace(/\/+$/, "")}`;

  const host = (await headers()).get("host");
  if (host) {
    const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
    return `${isLocal ? "http" : "https"}://${host}`;
  }

  return configured?.replace(/\/+$/, "") ?? "http://localhost:3000";
}
