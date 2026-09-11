"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/AuthCard";

/**
 * Establishes the session an invite / recovery email carries, then hands off
 * to the right next step.
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
  // A reset email is a returning user with a name already set; only a genuine
  // invite should be sent to /set-password, which also asks for one.
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function establishSession() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

      // `type` can arrive on either side of the URL depending on the template.
      const linkType = url.searchParams.get("type") ?? hash.get("type");
      const isRecovery = linkType === "recovery";
      setRecovery(isRecovery);

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
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          type: (linkType as "invite" | "recovery" | "email") ?? "invite",
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
      return data.session ? null : "This link is missing its sign-in token.";
    }

    establishSession().then((message) => {
      if (message) {
        setError(message);
        return;
      }
      const isRecovery =
        new URL(window.location.href).searchParams.get("type") === "recovery" ||
        new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery";
      // Strip the tokens from the address bar before moving on.
      window.history.replaceState({}, "", "/accept");
      router.replace(isRecovery ? "/reset-password" : "/set-password");
    });
  }, [router]);

  if (error) {
    return (
      <AuthCard
        title="That link didn't work"
        blurb={
          recovery
            ? `${error} Reset links expire after an hour — request a new one to continue.`
            : `${error} Invite links expire after a while — ask an admin to send you a new one.`
        }
      >
        <Link
          href={recovery ? "/forgot-password" : "/login"}
          className="piq-authlink"
        >
          {recovery ? "Request a new link" : "Back to sign in"}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={recovery ? "Verifying your link…" : "Setting up your account…"}
      blurb={recovery ? "One moment while we check your reset link." : "One moment while we verify your invite."}
    >
      <div
        className="piq-authspinner"
        role="status"
        aria-label="Loading"
      />
    </AuthCard>
  );
}
