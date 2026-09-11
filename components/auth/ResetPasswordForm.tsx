"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/actions/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormMessage";

export function ResetPasswordForm() {
  const { execute, isExecuting, result } = useAction(resetPassword);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const mismatch = confirm.length > 0 && password !== confirm;
  const error =
    result.serverError ??
    result.validationErrors?.password?._errors?.[0] ??
    (mismatch ? "Both passwords must match." : undefined);

  return (
    <AuthCard
      title="Choose a new password"
      blurb="Pick something you haven't used here before. You'll be signed in once it's saved."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (password !== confirm) return;
          execute({ password });
        }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <PasswordField
          label="New password"
          toggleLabel="new password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus
          hint="At least 8 characters, including a letter and a number."
          invalid={Boolean(result.validationErrors?.password)}
        />

        <PasswordField
          label="Confirm new password"
          toggleLabel="password confirmation"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          invalid={mismatch}
        />

        <FormError>{error}</FormError>

        <Button
          type="submit"
          disabled={isExecuting || mismatch || !password || !confirm}
          style={{ width: "100%", marginTop: 2 }}
        >
          {isExecuting ? "Saving…" : "Save password & sign in"}
        </Button>

        <Link href="/login" className="piq-authlink" style={{ alignSelf: "center" }}>
          Back to sign in
        </Link>
      </form>
    </AuthCard>
  );
}
