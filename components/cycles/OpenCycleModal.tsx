"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { openReviewCycle } from "@/actions/cycles";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";
import { FormError } from "@/components/ui/FormMessage";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Manual catch-up for opening a month. Months open on their own on the 1st,
 * so this exists for the cases that schedule cannot cover — a department
 * created mid-month, a team just switched to its own cycles, or a scheduled
 * run that did not fire.
 *
 * There is deliberately no free-text label or date range any more: the month
 * determines the name, the dates and the quarter, which is what stops a
 * cycle called "ABC" from running September to November.
 */
export function OpenCycleModal({
  departmentId,
  teamId,
  variant = "primary",
  icon = "ant-design:play-circle-outlined",
  size,
}: {
  departmentId?: string;
  teamId?: string;
  variant?: "primary" | "secondary";
  icon?: string;
  size?: "sm" | "md" | "lg" | "header";
}) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);

  const { execute, isExecuting, result, reset } = useAction(openReviewCycle, {
    onSuccess: ({ data }) => {
      if (data?.created) setOpen(false);
    },
  });

  if (!open) {
    return (
      <Button variant={variant} icon={icon} size={size} onClick={() => setOpen(true)}>
        Open a month
      </Button>
    );
  }

  const quarter = Math.floor((month - 1) / 3) + 1;
  const error = result.serverError;
  const notice = result.data && !result.data.created ? result.data.message : undefined;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(24,24,53,.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 50,
      }}
      onClick={() => {
        setOpen(false);
        reset();
      }}
    >
      <FrostCard
        tone="solid"
        padding={26}
        style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 18 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="piq-h3">Open a review month</div>
            <div className="piq-caption" style={{ marginTop: 4, lineHeight: 1.5 }}>
              Months normally open by themselves on the 1st. Use this to catch up a month that was missed.
            </div>
          </div>
          <IconButton
            icon="ant-design:close-outlined"
            aria-label="Close"
            onClick={() => {
              setOpen(false);
              reset();
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            Month
            <select
              className="piq-input"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6, width: 110 }}>
            Year
            <input
              className="piq-input"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="piq-caption">
          Falls in <strong>Q{quarter} {year}</strong> — it will use that quarter&rsquo;s KPIs.
        </div>

        {notice ? <div className="piq-caption">{notice}</div> : null}
        <FormError>{error}</FormError>

        <Button
          onClick={() => execute({ departmentId, teamId, year, month })}
          disabled={isExecuting}
          style={{ width: "100%" }}
        >
          {isExecuting ? "Opening…" : `Open ${MONTHS[month - 1]} ${year}`}
        </Button>
      </FrostCard>
    </div>
  );
}
