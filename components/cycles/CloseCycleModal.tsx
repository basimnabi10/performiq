"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { closeReviewCycle } from "@/actions/cycles";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";

export function CloseCycleModal({
  cycleId,
  cycleLabel,
  variant = "secondary",
  size,
}: {
  cycleId: string;
  cycleLabel: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg" | "header";
}) {
  const [open, setOpen] = useState(false);
  const { execute, isExecuting, result } = useAction(closeReviewCycle, { onSuccess: () => setOpen(false) });

  if (!open) {
    return (
      <Button variant={variant} icon="ant-design:stop-outlined" size={size} onClick={() => setOpen(true)}>
        Close cycle
      </Button>
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
      onClick={() => setOpen(false)}
    >
      <FrostCard
        tone="solid"
        style={{ width: 400, display: "flex", flexDirection: "column", gap: 14 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="piq-h3">Close {cycleLabel}?</span>
          <IconButton icon="ant-design:close-outlined" variant="chrome" size={32} label="Close" onClick={() => setOpen(false)} />
        </div>
        <div className="piq-caption">
          Reviews and scores from this cycle stay exactly as they are — closing it only lets you start
          the next one.
        </div>
        {result.serverError ? (
          <div className="piq-caption" style={{ color: "#FF5A5F" }}>
            {result.serverError}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" onClick={() => setOpen(false)} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button disabled={isExecuting} onClick={() => execute({ cycleId })} style={{ flex: 1 }}>
            {isExecuting ? "Closing…" : "Close cycle"}
          </Button>
        </div>
      </FrostCard>
    </div>
  );
}
