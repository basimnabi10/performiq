"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { setPassword } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";

export function SetPasswordForm() {
  const { execute, isExecuting, result } = useAction(setPassword);
  const [password, setPasswordValue] = useState("");

  const error = result.serverError ?? result.validationErrors?.password?._errors?.[0];

  return (
    <FrostCard tone="solid" style={{ width: 380, display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div className="piq-h2">Welcome to PerformIQ</div>
        <div className="piq-caption" style={{ marginTop: 4 }}>
          Choose a password to finish setting up your account.
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          execute({ password });
        }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          New password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPasswordValue(e.target.value)}
            autoComplete="new-password"
            style={{
              border: "1px solid rgba(255,255,255,.75)",
              borderRadius: 11,
              padding: "10px 14px",
              fontFamily: "'Switzer',sans-serif",
              fontSize: 14,
              background: "rgba(255,255,255,.6)",
              outline: "none",
              color: "#181835",
            }}
          />
        </label>

        {error ? (
          <div className="piq-caption" style={{ color: "#FF5A5F" }}>
            {error}
          </div>
        ) : null}

        <Button type="submit" disabled={isExecuting} style={{ width: "100%", marginTop: 4 }}>
          {isExecuting ? "Saving…" : "Set password & continue"}
        </Button>
      </form>
    </FrostCard>
  );
}
