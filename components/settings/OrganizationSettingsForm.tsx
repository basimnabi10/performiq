"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { updateOrganization } from "@/actions/organization";
import { Button } from "@/components/ui/Button";

export function OrganizationSettingsForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const { execute, isExecuting, result } = useAction(updateOrganization);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        execute({ name });
      }}
      style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Organization name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{
            height: 46,
            padding: "0 15px",
            fontSize: 14,
            color: "#181835",
            background: "rgba(255,255,255,.7)",
            border: "1.5px solid rgba(168,175,203,.4)",
            borderRadius: 12,
            fontFamily: "'Switzer',sans-serif",
            outline: "none",
          }}
        />
      </label>
      {result.serverError ? (
        <div className="piq-caption" style={{ color: "#FF5A5F" }}>
          {result.serverError}
        </div>
      ) : result.data !== undefined ? (
        <div className="piq-caption" style={{ color: "#273FF9" }}>
          Saved.
        </div>
      ) : null}
      <div>
        <Button type="submit" disabled={isExecuting || name.trim() === currentName}>
          {isExecuting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
