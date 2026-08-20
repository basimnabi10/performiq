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
//      following Next.js's documented nonce pattern — this is the app's XSS
//      hardening backstop, on top of never using dangerouslySetInnerHTML and
//      rendering user markdown without rehype-raw (see lib/sanitize.ts).
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // 'unsafe-inline' on style-src only: every UI primitive in components/ui
    // uses React inline `style` props by design (the exact frosted-glass
    // recipe). Inline STYLE injection is a much lower-severity vector than
    // inline SCRIPT, which stays locked down by the nonce below.
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

  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/set-password");
  const isApiPublic = pathname.startsWith("/api/auth/callback") || pathname.startsWith("/api/health");
  const isPublic = isAuthRoute || isApiPublic;

  if (!data.user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  if (data.user && isAuthRoute) {
    const redirect = NextResponse.redirect(new URL("/dashboard", request.url));
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
