"use client";

import { useAction } from "next-safe-action/hooks";
import { openMemberReview } from "@/actions/reviews";
import { Button } from "@/components/ui/Button";

/**
 * Shown when someone senior opens a review that is not theirs to fill in —
 * most often an employee's self-review.
 *
 * Without it the page is a dead end: an HOD is told who the assigned reviewer
 * is and left there, with no indication that reviewing that person themselves
 * is both allowed and one click away. The action opens their own manager
 * review of the same person, creating it if it does not exist.
 */
export function ReviewThisPersonButton({
  memberId,
  memberName,
  cycleId,
}: {
  memberId: string;
  memberName: string;
  cycleId: string;
}) {
  const { execute, isExecuting, result } = useAction(openMemberReview);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <Button
        icon="ant-design:form-outlined"
        disabled={isExecuting}
        onClick={() => execute({ memberId, cycleId })}
      >
        {isExecuting ? "Opening…" : `Review ${memberName.split(" ")[0]} yourself`}
      </Button>
      {result.serverError ? (
        <span className="piq-caption" style={{ color: "var(--error)" }}>
          {result.serverError}
        </span>
      ) : null}
    </div>
  );
}
