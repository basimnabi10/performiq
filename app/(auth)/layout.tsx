import { AuthShell } from "@/components/auth/AuthShell";

// Nonce-based CSP (proxy.ts) only matches script tags on a page rendered
// fresh per request -- a statically prerendered page bakes in whatever
// nonce existed at build time, which can never match a later per-request
// value. Every page under this layout needs to actually execute client JS
// (the auth forms), so this must stay dynamic.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <AuthShell>{children}</AuthShell>
    </div>
  );
}
