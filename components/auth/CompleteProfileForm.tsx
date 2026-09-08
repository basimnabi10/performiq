"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { completeProfile } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";

export function CompleteProfileForm() {
  const { execute, isExecuting, result } = useAction(completeProfile);
  const [name, setName] = useState("");

  const error = result.serverError ?? result.validationErrors?.name?._errors?.[0];

  return (
    <FrostCard tone="solid" style={{ width: 380, display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div className="piq-h2">One last thing</div>
        <div className="piq-caption" style={{ marginTop: 4 }}>
          Tell us your name so your team sees who you are instead of your email address.
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          execute({ name });
        }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          Full name
          <input
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
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

        <Button type="submit" disabled={isExecuting || !name.trim()} style={{ width: "100%", marginTop: 4 }}>
          {isExecuting ? "Saving…" : "Continue"}
        </Button>
      </form>
    </FrostCard>
  );
}
