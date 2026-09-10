"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { completeProfile } from "@/actions/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormMessage";

export function CompleteProfileForm() {
  const { execute, isExecuting, result } = useAction(completeProfile);
  const [name, setName] = useState("");

  const error = result.serverError ?? result.validationErrors?.name?._errors?.[0];

  return (
    <AuthCard
      title="One last thing"
      blurb="Tell us your name so your team sees who you are instead of your email address."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          execute({ name });
        }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <Field
          label="Full name"
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          autoFocus
          icon="ant-design:user-outlined"
          invalid={Boolean(result.validationErrors?.name)}
        />

        <FormError>{error}</FormError>

        <Button
          type="submit"
          disabled={isExecuting || !name.trim()}
          style={{ width: "100%", marginTop: 2 }}
        >
          {isExecuting ? "Saving…" : "Continue"}
        </Button>
      </form>
    </AuthCard>
  );
}
