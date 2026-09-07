"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { startReview } from "@/actions/reviews";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";

interface MemberOption {
  id: string;
  name: string;
  managerId: string | null;
}

const TYPE_OPTIONS = [
  { value: "self", label: "Self review" },
  { value: "manager", label: "Manager review" },
  { value: "peer", label: "Peer review" },
] as const;

export function StartReviewModal({
  cycleId,
  members,
  actorId,
}: {
  cycleId: string;
  members: MemberOption[];
  /** The person clicking "Start review" — defaults the reviewer to them, since
   * that's who's most likely conducting it (an admin/HOD/manager reviewing a
   * direct report themselves), rather than an arbitrary or wrong member. */
  actorId: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]["value"]>("manager");
  const firstReviewee = members.find((m) => m.id !== actorId)?.id ?? members[0]?.id ?? "";
  const [revieweeId, setRevieweeId] = useState(firstReviewee);
  const [reviewerId, setReviewerId] = useState(actorId || members[0]?.id || "");

  const { execute, isExecuting, result, reset } = useAction(startReview, { onSuccess: () => setOpen(false) });

  const reviewee = members.find((m) => m.id === revieweeId);

  function selectReviewee(id: string) {
    setRevieweeId(id);
    if (type === "self") setReviewerId(id);
  }

  function selectType(t: (typeof TYPE_OPTIONS)[number]["value"]) {
    setType(t);
    if (t === "self") setReviewerId(revieweeId);
    else setReviewerId(actorId || members[0]?.id || "");
  }

  if (!open) {
    return (
      <Button icon="ant-design:plus-outlined" onClick={() => setOpen(true)}>
        Start review
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
        style={{ width: 420, display: "flex", flexDirection: "column", gap: 14 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="piq-h3">Start a review</span>
          <IconButton icon="ant-design:close-outlined" variant="chrome" size={32} label="Close" onClick={() => setOpen(false)} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            execute({ cycleId, revieweeId, reviewerId, type });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            Review type
            <div style={{ display: "flex", gap: 6 }}>
              {TYPE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={type === opt.value ? "primary" : "secondary"}
                  onClick={() => selectType(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </label>
          <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            Reviewee
            <select value={revieweeId} onChange={(e) => selectReviewee(e.target.value)} style={inputStyle}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          {type !== "self" ? (
            <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              Reviewer {reviewerId === actorId ? "(defaults to you)" : ""}
              <select value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} style={inputStyle}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id === actorId ? `${m.name} (you)` : m.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="piq-caption">Reviewer: {reviewee?.name} (self)</div>
          )}
          {result.serverError ? (
            <div className="piq-caption" style={{ color: "#FF5A5F" }}>
              {result.serverError}
            </div>
          ) : null}
          <Button type="submit" disabled={isExecuting}>
            {isExecuting ? "Starting…" : "Start review"}
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
