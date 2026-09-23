"use client";

import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { openMemberReview } from "@/actions/reviews";

/**
 * Row actions in the members list: review the person, or open their profile.
 *
 * Review is the labelled button and profile is the icon, because the list is
 * overwhelmingly used to get reviews done — and because the control this
 * replaces was a bare arrow that silently meant "profile", which is exactly
 * the ambiguity an icon-only primary action creates.
 */
export function MemberRowActions({
  memberId,
  memberName,
  cycleId,
  canReview,
}: {
  memberId: string;
  memberName: string;
  /** Null when no month is open — nothing to review against. */
  cycleId: string | null;
  canReview: boolean;
}) {
  const { execute, isExecuting } = useAction(openMemberReview);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
      {canReview && cycleId ? (
        <button
          type="button"
          disabled={isExecuting}
          onClick={() => execute({ memberId, cycleId })}
          title={`Review ${memberName}`}
          style={{
            height: 34,
            padding: "0 14px",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            border: "none",
            borderRadius: 10,
            background: "linear-gradient(135deg,#3A63FA,#273FF9)",
            color: "#fff",
            font: "500 12.5px 'Switzer',sans-serif",
            cursor: isExecuting ? "wait" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <iconify-icon icon="ant-design:form-outlined" width={14} />
          {isExecuting ? "Opening…" : "Review"}
        </button>
      ) : null}

      <Link
        href={`/members/${memberId}`}
        title={`View ${memberName}'s profile`}
        aria-label={`View ${memberName}'s profile`}
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "rgba(58,99,250,.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#273FF9",
          flexShrink: 0,
        }}
      >
        <iconify-icon icon="ant-design:user-outlined" width={15} />
      </Link>
    </div>
  );
}
