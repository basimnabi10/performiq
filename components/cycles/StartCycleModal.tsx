"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { startReviewCycle } from "@/actions/cycles";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";

export function StartCycleModal({
  departmentId,
  variant = "primary",
  icon = "ant-design:play-circle-outlined",
}: {
  departmentId?: string;
  variant?: "primary" | "secondary";
  icon?: string;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { execute, isExecuting, result, reset } = useAction(startReviewCycle, {
    onSuccess: () => setOpen(false),
  });

  if (!open) {
    return (
      <Button variant={variant} icon={icon} onClick={() => setOpen(true)}>
        Start review cycle
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
      onClick={() => {
        setOpen(false);
        reset();
      }}
    >
      <FrostCard
        tone="solid"
        style={{ width: 400, display: "flex", flexDirection: "column", gap: 14 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="piq-h3">Start review cycle</span>
          <IconButton icon="ant-design:close-outlined" variant="chrome" size={32} label="Close" onClick={() => setOpen(false)} />
        </div>
        <div className="piq-caption">
          Creates self- and manager-review shells for every member in scope. KPIs can then be
          created against this cycle.
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            execute({ label, departmentId, startDate, endDate });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            Cycle label
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Q4 2026" required style={inputStyle} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              Start date
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={inputStyle} />
            </label>
            <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              End date
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required style={inputStyle} />
            </label>
          </div>
          {result.serverError ? (
            <div className="piq-caption" style={{ color: "#FF5A5F" }}>
              {result.serverError}
            </div>
          ) : null}
          <Button type="submit" disabled={isExecuting}>
            {isExecuting ? "Starting…" : "Start cycle"}
          </Button>
        </form>
      </FrostCard>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.75)",
  borderRadius: 11,
  padding: "10px 14px",
  fontFamily: "'Switzer',sans-serif",
  fontSize: 14,
  background: "rgba(255,255,255,.6)",
  outline: "none",
  color: "#181835",
};
