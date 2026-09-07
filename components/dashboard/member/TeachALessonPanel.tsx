"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { submitLessonRequest } from "@/actions/lessons";
import { Button } from "@/components/ui/Button";

export interface MyLessonRequestRow {
  id: string;
  topic: string;
  status: "pending" | "approved" | "declined";
  createdAgo: string;
}

const STATUS_STYLE: Record<MyLessonRequestRow["status"], { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#596392", bg: "rgba(89,99,146,.14)" },
  approved: { label: "Approved", color: "#273FF9", bg: "rgba(58,99,250,.13)" },
  declined: { label: "Declined", color: "#fff", bg: "#252944" },
};

export function TeachALessonPanel({ requests }: { requests: MyLessonRequestRow[] }) {
  const [topic, setTopic] = useState("");
  const [why, setWhy] = useState("");
  const { execute, isExecuting, result } = useAction(submitLessonRequest, {
    onSuccess: () => {
      setTopic("");
      setWhy("");
    },
  });

  return (
    <div
      style={{
        gridColumn: "span 6",
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 24,
        padding: 24,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 24,
      }}
    >
      <div>
        <div className="piq-h3" style={{ marginBottom: 4 }}>
          Teach a lesson
        </div>
        <div className="piq-caption" style={{ marginBottom: 14 }}>
          Picked up something worth sharing? Request access to publish it as a course.
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            execute({ topic, why: why || undefined });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic, e.g. Prototyping in code"
            required
            style={inputStyle}
          />
          <textarea
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="Why this matters (optional)"
            rows={2}
            style={{ ...inputStyle, height: "auto", padding: "10px 14px", resize: "vertical" }}
          />
          {result.serverError ? (
            <div className="piq-caption" style={{ color: "#FF5A5F" }}>
              {result.serverError}
            </div>
          ) : null}
          <Button type="submit" size="sm" disabled={isExecuting} style={{ alignSelf: "flex-start" }}>
            {isExecuting ? "Sending…" : "Request access"}
          </Button>
        </form>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#767FA5", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 12 }}>
          Your requests
        </div>
        {requests.length === 0 ? (
          <div className="piq-caption">No requests yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {requests.map((r) => {
              const s = STATUS_STYLE[r.status];
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,.5)", borderRadius: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#252944", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.topic}</div>
                    <div style={{ fontSize: 11, color: "#A8AFCB" }}>{r.createdAgo}</div>
                  </div>
                  <span style={{ display: "inline-flex", fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 7, color: s.color, background: s.bg, flexShrink: 0 }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 44,
  padding: "0 14px",
  fontSize: 14,
  color: "#181835",
  background: "rgba(255,255,255,.7)",
  border: "1.5px solid rgba(168,175,203,.4)",
  borderRadius: 12,
  fontFamily: "'Switzer',sans-serif",
  outline: "none",
};
