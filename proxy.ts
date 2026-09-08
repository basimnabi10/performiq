import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (the exported function is
// `proxy`, not `middleware`). This does two things on every request:
//   1. Refreshes the Supabase session cookie and redirects unauthenticated
//      visitors away from the dashboard — a UX convenience only. Per Next's
//      own guidance, a proxy matcher change can silently stop covering a
//      route, so every Server Action re-checks auth itself via lib/authz.ts
//      rather than relying on this file as the real boundary.
//   2. Sets a per-request CSP nonce (script-src 'nonce-…' 'strict-dynamic'),
//      following Next.js's documented nonce pattern — Next automatically
//      applies this same nonce to its own internally-injected scripts
//      (hydration/RSC streaming), which is why a nonce (not a static
//      'self'-only policy) is required here: those internal scripts are
//      inline, and a plain `script-src 'self'` blocks them outright.
//      IMPORTANT: nonces only work on pages that render fresh per request —
//      every route this covers must avoid static prerendering (see
//      `export const dynamic = "force-dynamic"` on app/(auth)/layout.tsx),
//      or the nonce baked into a build-time HTML snapshot will never match
//      the fresh value generated below, silently blocking every script.
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} https://api.iconify.design https://api.simplesvg.com https://api.unisvg.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          response.headers.set("Content-Security-Policy", csp);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // /set-password is reachable both signed-out (link not yet exchanged) and
  // signed-in — accepting an invite establishes a session and THEN asks for a
  // password, so it must not be treated as a "you're already signed in, go
  // away" route or the invitee is bounced to a dashboard and never sets one.
  // /accept and /set-password both need to work WITH a session: accepting an
  // invite signs you in and only then asks for a password, so bouncing
  // signed-in users off them strands invitees without one.
  const isSetPassword = pathname.startsWith("/set-password") || pathname.startsWith("/accept");
  const isAuthRoute = pathname.startsWith("/login") || isSetPassword;
  const isApiPublic =
    pathname.startsWith("/api/auth/callback") ||
    pathname.startsWith("/api/auth/orphaned") ||
    pathname.startsWith("/api/health");
  const isPublic = isAuthRoute || isApiPublic;

  if (!data.user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  if (data.user && isAuthRoute && !isSetPassword) {
    const redirect = NextResponse.redirect(new URL("/dashboard", request.url));
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    {
      // Excluding Next.js's own prefetch requests (not just static assets)
      // matters here specifically: the sidebar renders 5-6 <Link>s at once,
      // which Next prefetches concurrently the moment they're visible. Each
      // prefetch used to hit this file and call supabase.auth.getUser(),
      // and near a token's expiry, two of those concurrent calls could race
      // Supabase's refresh-token rotation -- the loser's now-already-used
      // refresh token comes back invalid, killing the whole session. This
      // is a UX convenience layer (see comment above), so skipping it for
      // prefetches costs nothing: lib/authz.ts still gates the real render.
      source: "/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
