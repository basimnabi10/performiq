"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { submitMoodCheckin } from "@/actions/mood";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";

const SCALE = [
  { value: 5, emoji: "😄", label: "Great" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 1, emoji: "😣", label: "Struggling" },
];

export function MoodCheckinWidget({ initialValue }: { initialValue: number | null }) {
  const [value, setValue] = useState<number | null>(initialValue);
  const [reason, setReason] = useState("");
  const { execute, isExecuting, result } = useAction(submitMoodCheckin);

  return (
    <FrostCard style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="piq-h3">Today&rsquo;s mood check-in</div>
      <div className="piq-caption">Only your HOD sees the reason you write, if you write one.</div>
      <div style={{ display: "flex", gap: 10 }}>
        {SCALE.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setValue(s.value)}
            title={s.label}
            style={{
              fontSize: 26,
              border: "none",
              borderRadius: 12,
              padding: 8,
              cursor: "pointer",
              background: value === s.value ? "rgba(58,99,250,.18)" : "transparent",
            }}
          >
            {s.emoji}
          </button>
        ))}
      </div>
      <textarea
        placeholder="Anything you want your HOD to know? (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        style={{
          border: "1px solid rgba(255,255,255,.6)",
          borderRadius: 11,
          padding: "8px 12px",
          fontFamily: "'Switzer',sans-serif",
          fontSize: 13,
          background: "rgba(255,255,255,.45)",
          outline: "none",
          resize: "vertical",
        }}
      />
      {result.serverError ? (
        <div className="piq-caption" style={{ color: "#FF5A5F" }}>
          {result.serverError}
        </div>
      ) : null}
      <Button
        size="sm"
        style={{ width: 160 }}
        disabled={value == null || isExecuting}
        onClick={() => value != null && execute({ value, reason: reason || undefined })}
      >
        {isExecuting ? "Saving…" : initialValue != null ? "Update check-in" : "Save check-in"}
      </Button>
    </FrostCard>
  );
}
