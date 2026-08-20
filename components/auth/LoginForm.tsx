"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";

export function LoginForm() {
  const { execute, isExecuting, result } = useAction(login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const error =
    result.serverError ??
    result.validationErrors?.email?._errors?.[0] ??
    result.validationErrors?.password?._errors?.[0];

  return (
    <FrostCard tone="solid" style={{ width: 380, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 32% 28%,#ffffff,#8BB0FF 28%,#273FF9 72%,#1C10C9)",
            boxShadow:
              "0 5px 12px rgba(39,63,249,.4),inset -2px -3px 6px rgba(14,6,125,.5),inset 2px 2px 6px rgba(255,255,255,.6)",
          }}
        />
        <span className="piq-h2">PerformIQ</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          execute({ email, password });
        }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            style={inputStyle}
          />
        </label>
        <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={inputStyle}
          />
        </label>

        {error ? (
          <div className="piq-caption" style={{ color: "#FF5A5F" }}>
            {error}
          </div>
        ) : null}

        <Button type="submit" disabled={isExecuting} style={{ width: "100%", marginTop: 4 }}>
          {isExecuting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </FrostCard>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.75)",
  borderRadius: 11,
  padding: "10px 14px",
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 14,
  background: "rgba(255,255,255,.6)",
  outline: "none",
  color: "#181835",
};
