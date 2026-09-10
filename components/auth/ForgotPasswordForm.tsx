"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/actions/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FormError, Notice } from "@/components/ui/FormMessage";

export function ForgotPasswordForm() {
  const { execute, isExecuting, result } = useAction(requestPasswordReset);
  const [email, setEmail] = useState("");

  const sent = result.data?.sent === true;
  const error = result.serverError ?? result.validationErrors?.email?._errors?.[0];

  // Deliberately identical whether or not the address has an account -- the
  // action can't tell us, by design (see requestPasswordReset).
  if (sent) {
    return (
      <AuthCard title="Check your email">
        <Notice tone="success">
          If an account exists for <strong>{email}</strong>, a reset link is on its way. The link
          expires in an hour.
        </Notice>
        <p className="piq-caption" style={{ margin: 0, lineHeight: 1.55 }}>
          Nothing arrived? Check your spam folder, or ask an admin to confirm which address your
          account uses.
        </p>
        <Link href="/login" className="piq-authlink">
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      blurb="Enter the email address you sign in with and we'll send you a link to choose a new password."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          execute({ email });
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

        <FormError>{error}</FormError>

        <Button type="submit" disabled={isExecuting} style={{ width: "100%", marginTop: 2 }}>
          {isExecuting ? "Sending…" : "Send reset link"}
        </Button>

        <Link href="/login" className="piq-authlink" style={{ alignSelf: "center" }}>
          Back to sign in
        </Link>
      </form>
    </AuthCard>
  );
}
