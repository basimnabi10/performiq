"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { assignReviewer } from "@/actions/reviews";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";

interface MemberOption {
  id: string;
  name: string;
}

export function AssignReviewerModal({
  cycleId,
  members,
}: {
  cycleId: string;
  members: MemberOption[];
}) {
  const [open, setOpen] = useState(false);
  const [revieweeId, setRevieweeId] = useState(members[0]?.id ?? "");
  const [reviewerId, setReviewerId] = useState(members[1]?.id ?? members[0]?.id ?? "");

  const { execute, isExecuting, result, reset } = useAction(assignReviewer, {
    onSuccess: () => setOpen(false),
  });

  if (!open) {
    return (
      <Button icon="ant-design:usergroup-add-outlined" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Assign reviewer
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
          <span className="piq-h3">Assign a peer reviewer</span>
          <IconButton icon="ant-design:close-outlined" variant="chrome" size={32} label="Close" onClick={() => setOpen(false)} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            execute({ cycleId, revieweeId, reviewerId });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            Reviewee
            <select value={revieweeId} onChange={(e) => setRevieweeId(e.target.value)} style={inputStyle}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            Reviewer
            <select value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} style={inputStyle}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          {result.serverError ? (
            <div className="piq-caption" style={{ color: "#FF5A5F" }}>
              {result.serverError}
            </div>
          ) : null}
          <Button type="submit" disabled={isExecuting}>
            {isExecuting ? "Assigning…" : "Assign"}
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
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 14,
  background: "rgba(255,255,255,.6)",
  outline: "none",
  color: "#181835",
};
