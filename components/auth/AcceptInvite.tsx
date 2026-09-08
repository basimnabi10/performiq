"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { FrostCard } from "@/components/ui/FrostCard";

/**
 * Establishes the session an invite / recovery email carries, then hands off
 * to /set-password.
 *
 * Supabase can deliver that session three different ways depending on how the
 * link was generated, and only one of them is readable by a server route:
 *   - `#access_token=…&refresh_token=…` — admin-generated invites (no PKCE
 *     verifier exists in this browser). A fragment never reaches the server,
 *     which is why this runs client-side.
 *   - `?token_hash=…&type=…` — templates using {{ .TokenHash }}.
 *   - `?code=…` — PKCE, for flows this browser actually started.
 * All three are handled so the link works whatever the project is configured
 * to send.
 */
export function AcceptInvite() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function establishSession() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

      // Supabase reports failures on the fragment too (expired links).
      const hashError = hash.get("error_description") ?? hash.get("error");
      if (hashError) return hashError;

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        return error?.message ?? null;
      }

      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          type: (type as "invite" | "recovery" | "email") ?? "invite",
          token_hash: tokenHash,
        });
        return error?.message ?? null;
      }

      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        return error?.message ?? null;
      }

      // Nothing in the URL — but an existing session is fine (e.g. a refresh
      // after the tokens were already consumed and stripped).
      const { data } = await supabase.auth.getSession();
      return data.session ? null : "This invite link is missing its sign-in token.";
    }

    establishSession().then((message) => {
      if (message) {
        setError(message);
        return;
      }
      // Strip the tokens from the address bar before moving on.
      window.history.replaceState({}, "", "/accept");
      router.replace("/set-password");
    });
  }, [router]);

  return (
    <FrostCard tone="solid" style={{ width: 380, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="piq-h2">{error ? "That link didn't work" : "Setting up your account…"}</div>
      {error ? (
        <>
          <div className="piq-caption" style={{ lineHeight: 1.55 }}>
            {error} Invite links expire after a while — ask an admin to send you a new one.
          </div>
          <a href="/login" style={{ fontSize: 13, fontWeight: 500, color: "#273FF9", marginTop: 4 }}>
            Back to sign in
          </a>
        </>
      ) : (
        <div className="piq-caption">One moment while we verify your invite.</div>
      )}
    </FrostCard>
  );
}
