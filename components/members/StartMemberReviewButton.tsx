"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { startReview } from "@/actions/reviews";

/**
 * Creates a manager-review shell for someone who has none in the current
 * cycle, then opens it. Anyone invited after the cycle started falls into
 * this gap — cycle shells are generated once, at start — and without it
 * their profile shows no way to review them at all.
 */
export function StartMemberReviewButton({
  cycleId,
  revieweeId,
  reviewerId,
}: {
  cycleId: string;
  revieweeId: string;
  reviewerId: string;
}) {
  const router = useRouter();
  const { execute, isExecuting, result } = useAction(startReview, {
    onSuccess: ({ data }) => {
      if (data?.reviewId) router.push(`/reviews/${data.reviewId}`);
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        disabled={isExecuting}
        onClick={() => execute({ cycleId, revieweeId, reviewerId, type: "manager" })}
        style={{
          height: 44,
          padding: "0 20px",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          font: "500 13px 'Switzer',sans-serif",
          color: "#181835",
          background: "#fff",
          border: "none",
          borderRadius: 13,
          cursor: isExecuting ? "default" : "pointer",
          boxShadow: "0 10px 24px rgba(0,0,0,.18)",
        }}
      >
        <iconify-icon icon="ant-design:edit-outlined" width={15} />
        {isExecuting ? "Starting…" : "Start review"}
      </button>
      {result.serverError ? (
        <span style={{ fontSize: 11, color: "#FFB4B7" }}>{result.serverError}</span>
      ) : null}
    </div>
  );
}
