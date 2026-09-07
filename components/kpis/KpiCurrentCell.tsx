"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { updateKpiCurrent } from "@/actions/kpis";

/**
 * The "Current" cell in the KPI manager: shows the recorded measurement and
 * its on/below-target badge, and (for admins/HODs) lets it be recorded
 * inline. Read-only for everyone else.
 */
export function KpiCurrentCell({
  kpiId,
  currentValue,
  currentNumeric,
  status,
  hasTarget,
  canEdit,
}: {
  kpiId: string;
  currentValue: string | null;
  currentNumeric: string | null;
  status: "on" | "below" | null;
  /** Without a target there's nothing to be on or below, so a recorded value
   * reads as "No target set" rather than the misleading "Not measured". */
  hasTarget: boolean;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentNumeric ?? "");
  const { execute, isExecuting, result } = useAction(updateKpiCurrent, { onSuccess: () => setEditing(false) });

  const badge =
    status === "on"
      ? { label: "On target", color: "#273FF9", bg: "rgba(58,99,250,.13)" }
      : status === "below"
        ? { label: "Below target", color: "#596392", bg: "rgba(89,99,146,.14)" }
        : currentValue && !hasTarget
          ? { label: "No target set", color: "#596392", bg: "rgba(89,99,146,.14)" }
          : { label: "Not measured", color: "#596392", bg: "rgba(89,99,146,.14)" };

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          execute({ kpiId, currentValue: value.trim() });
        }}
        style={{ display: "flex", flexDirection: "column", gap: 4 }}
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          placeholder="e.g. 93"
          onBlur={() => execute({ kpiId, currentValue: value.trim() })}
          style={{
            height: 34,
            width: "100%",
            padding: "0 10px",
            fontSize: 14,
            color: "#181835",
            background: "rgba(255,255,255,.85)",
            border: "1.5px solid rgba(58,99,250,.4)",
            borderRadius: 9,
            fontFamily: "'Switzer',sans-serif",
            fontVariantNumeric: "tabular-nums",
            outline: "none",
          }}
        />
        <span style={{ fontSize: 10, color: isExecuting ? "#273FF9" : "#A8AFCB" }}>
          {isExecuting ? "Saving…" : result.serverError ? result.serverError : "Enter to save · blank clears"}
        </span>
      </form>
    );
  }

  return (
    <div
      onClick={canEdit ? () => setEditing(true) : undefined}
      title={canEdit ? "Click to record this cycle's measured value" : undefined}
      style={{ cursor: canEdit ? "pointer" : "default" }}
    >
      <div style={{ fontSize: 16, fontWeight: 500, color: currentValue ? "#181835" : "#A8AFCB", fontVariantNumeric: "tabular-nums" }}>
        {currentValue ?? "—"}
      </div>
      <span
        style={{
          display: "inline-flex",
          fontSize: 11,
          fontWeight: 500,
          padding: "2px 7px",
          borderRadius: 6,
          marginTop: 3,
          color: badge.color,
          background: badge.bg,
        }}
      >
        {badge.label}
      </span>
    </div>
  );
}
