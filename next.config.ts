import path from "node:path";
import type { NextConfig } from "next";

// Full CSP (with per-request nonces via proxy.ts) is wired in the Phase F
// hardening pass, once every script/style source in the app is finalized.
// These are the static headers that don't depend on that.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Silences a Turbopack workspace-root warning: an unrelated
  // package-lock.json in $HOME (outside this git repo) would otherwise be
  // treated as a monorepo root candidate.
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
