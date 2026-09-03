"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { submitLessonRequest } from "@/actions/lessons";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";

export interface LessonRequestRow {
  id: string;
  topic: string;
  status: "pending" | "approved" | "declined";
}

export function LessonRequestForm({ requests }: { requests: LessonRequestRow[] }) {
  const [topic, setTopic] = useState("");
  const [why, setWhy] = useState("");
  const { execute, isExecuting, result } = useAction(submitLessonRequest, {
    onSuccess: () => {
      setTopic("");
      setWhy("");
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="piq-caption">
        Want to teach a lesson? Send your HOD a request — once approved, you can author courses.
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
          placeholder="Topic"
          required
          style={inputStyle}
        />
        <textarea
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="Why this topic? (optional)"
          rows={2}
          style={inputStyle}
        />
        {result.serverError ? (
          <div className="piq-caption" style={{ color: "#FF5A5F" }}>
            {result.serverError}
          </div>
        ) : null}
        <Button type="submit" size="sm" disabled={isExecuting} style={{ width: 160 }}>
          {isExecuting ? "Sending…" : "Send request"}
        </Button>
      </form>

      {requests.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {requests.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="piq-caption">{r.topic}</span>
              <Tag tone={r.status === "approved" ? "onTrack" : r.status === "declined" ? "atRisk" : "neutral"} dot>
                {r.status}
              </Tag>
            </div>
          ))}
        </div>
      ) : null}
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
