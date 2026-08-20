"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { updateDesignation } from "@/actions/members";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";

export function DesignationModal({ memberId, currentTitle }: { memberId: string; currentTitle: string }) {
  const [open, setOpen] = useState(false);
  const [jobTitle, setJobTitle] = useState(currentTitle);
  const { execute, isExecuting, result, reset } = useAction(updateDesignation, {
    onSuccess: () => setOpen(false),
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ border: "none", background: "transparent", color: "#8BB0FF", fontSize: 13, cursor: "pointer", padding: 0 }}
      >
        Change designation
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(24,24,53,.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
      onClick={() => {
        setOpen(false);
        reset();
      }}
    >
      <FrostCard
        tone="solid"
        style={{ width: 380, display: "flex", flexDirection: "column", gap: 14 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="piq-h3">Change designation</span>
          <IconButton
            icon="ant-design:close-outlined"
            variant="chrome"
            size={32}
            label="Close"
            onClick={() => setOpen(false)}
          />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            execute({ memberId, jobTitle });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            required
            style={{
              border: "1px solid rgba(255,255,255,.75)",
              borderRadius: 11,
              padding: "10px 14px",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 14,
              background: "rgba(255,255,255,.6)",
              outline: "none",
            }}
          />
          {result.serverError ? (
            <div className="piq-caption" style={{ color: "#FF5A5F" }}>
              {result.serverError}
            </div>
          ) : null}
          <Button type="submit" disabled={isExecuting}>
            {isExecuting ? "Saving…" : "Save"}
          </Button>
        </form>
      </FrostCard>
    </div>
  );
}
