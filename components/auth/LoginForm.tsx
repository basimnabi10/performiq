"use client";

import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/actions/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { FormError, Notice } from "@/components/ui/FormMessage";

export function LoginForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const { execute, isExecuting, result } = useAction(login);

  // Supabase rewrites an invite's redirect_to to the project's Site URL
  // whenever the URL we asked for isn't on its allowlist — which lands
  // invitees on "/" and, with no session yet, here on /login, carrying their
  // one-time tokens in the URL fragment. A fragment never reaches the
  // server, so nothing upstream can act on it; forward it to /accept, which
  // knows how to exchange it, instead of stranding them on a sign-in form
  // for a password they haven't set.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    if (params.get("access_token") || params.get("token_hash") || params.get("error_description")) {
      router.replace(`/accept${hash}`);
    }
  }, [router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const error =
    result.serverError ??
    result.validationErrors?.email?._errors?.[0] ??
    result.validationErrors?.password?._errors?.[0];

  return (
    <AuthCard
      title="Sign in"
      blurb="Use your company credentials. We'll take you to the right workspace automatically."
    >
      {notice ? <Notice>{notice}</Notice> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          execute({ email, password });
        }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <Field
          label="Email address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
          placeholder="you@company.com"
          icon="ant-design:mail-outlined"
          invalid={Boolean(result.validationErrors?.email)}
        />

        <PasswordField
          label="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
          invalid={Boolean(result.validationErrors?.password)}
        />

        <FormError>{error}</FormError>

        <Button
          type="submit"
          disabled={isExecuting}
          iconRight={isExecuting ? undefined : "ant-design:arrow-right-outlined"}
          style={{ width: "100%", marginTop: 2 }}
        >
          {isExecuting ? "Signing in…" : "Sign in"}
        </Button>

        <Link href="/forgot-password" className="piq-authlink" style={{ alignSelf: "center" }}>
          Forgot password?
        </Link>
      </form>
    </AuthCard>
  );
}
