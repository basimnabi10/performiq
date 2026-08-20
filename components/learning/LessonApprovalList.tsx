"use client";

import { useAction } from "next-safe-action/hooks";
import { decideLessonRequest } from "@/actions/lessons";
import { Button } from "@/components/ui/Button";

export interface PendingLessonRequest {
  id: string;
  memberName: string;
  topic: string;
}

export function LessonApprovalList({ requests }: { requests: PendingLessonRequest[] }) {
  const { execute, isExecuting } = useAction(decideLessonRequest);

  if (requests.length === 0) {
    return <div className="piq-caption">No pending lesson requests.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {requests.map((r) => (
        <div
          key={r.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(255,255,255,.35)",
          }}
        >
          <div style={{ fontSize: 13 }}>
            <strong>{r.memberName}</strong> · {r.topic}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button
              size="sm"
              variant="secondary"
              disabled={isExecuting}
              onClick={() => execute({ requestId: r.id, decision: "declined" })}
            >
              Decline
            </Button>
            <Button size="sm" disabled={isExecuting} onClick={() => execute({ requestId: r.id, decision: "approved" })}>
              Approve
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
