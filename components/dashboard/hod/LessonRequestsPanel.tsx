"use client";

import { useAction } from "next-safe-action/hooks";
import { decideLessonRequest } from "@/actions/lessons";
import { Avatar } from "@/components/ui/Avatar";

export interface LessonRequestRow {
  id: string;
  memberName: string;
  topic: string;
  why: string | null;
  createdAgo: string;
}

export function LessonRequestsPanel({ requests }: { requests: LessonRequestRow[] }) {
  const { execute, isExecuting } = useAction(decideLessonRequest);

  return (
    <div
      style={{
        gridColumn: "span 2",
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 10px 30px rgba(70,100,190,.1)",
        borderRadius: 22,
        padding: 22,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Lesson requests</div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 500,
            padding: "4px 10px",
            borderRadius: 8,
            color: requests.length > 0 ? "#fff" : "#596392",
            background: requests.length > 0 ? "#252944" : "rgba(89,99,146,.14)",
          }}
        >
          {requests.length > 0 ? `${requests.length} pending` : "All clear"}
        </span>
      </div>
      {requests.length === 0 ? (
        <span className="piq-caption" style={{ lineHeight: 1.55 }}>
          No lesson requests right now. Members can ask to publish their own video lessons from their dashboard.
        </span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {requests.map((r) => (
            <div key={r.id} style={{ padding: 13, background: "rgba(255,255,255,.5)", border: "1px solid rgba(168,175,203,.25)", borderRadius: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Avatar name={r.memberName} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#181835", lineHeight: 1.35 }}>{r.topic}</div>
                  <div style={{ fontSize: 11, color: "#767FA5", marginTop: 2 }}>
                    {r.memberName} · {r.createdAgo}
                  </div>
                </div>
              </div>
              {r.why ? <div style={{ fontSize: 12, color: "#454D7A", marginTop: 9, lineHeight: 1.5 }}>{r.why}</div> : null}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  disabled={isExecuting}
                  onClick={() => execute({ requestId: r.id, decision: "approved" })}
                  style={{
                    flex: 1,
                    height: 36,
                    font: "500 12px 'Switzer',sans-serif",
                    color: "#fff",
                    background: "linear-gradient(135deg,#3A63FA,#273FF9)",
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  Approve
                </button>
                <button
                  disabled={isExecuting}
                  onClick={() => execute({ requestId: r.id, decision: "declined" })}
                  style={{
                    flex: 1,
                    height: 36,
                    font: "500 12px 'Switzer',sans-serif",
                    color: "#454D7A",
                    background: "rgba(255,255,255,.7)",
                    border: "1px solid rgba(168,175,203,.4)",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
