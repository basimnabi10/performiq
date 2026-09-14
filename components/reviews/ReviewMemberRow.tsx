"use client";

import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { openMemberReview } from "@/actions/reviews";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

export interface ReviewMemberRowData {
  memberId: string;
  name: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  reviewId: string | null;
  /** Whether the existing review is the current person's to complete. */
  isMine: boolean;
  status: "none" | "pending" | "in_progress" | "completed";
  score: number | null;
}

const STATUS = {
  none: { label: "Not started", bg: "rgba(168,175,203,.22)", color: "#454D7A" },
  pending: { label: "Pending", bg: "rgba(250,173,20,.18)", color: "#8A5D00" },
  in_progress: { label: "Draft saved", bg: "rgba(39,63,249,.12)", color: "#1C10C9" },
  completed: { label: "Submitted", bg: "rgba(47,191,113,.16)", color: "#1B7A48" },
} as const;

/**
 * One person in the review queue.
 *
 * "Review now" goes through a server action rather than a link, because the
 * review may not exist yet: shells are only created for the member and their
 * manager, so an HOD covering someone else's team has nothing to link to. The
 * action creates it and redirects, so the button always does what it says.
 */
export function ReviewMemberRow({
  row,
  cycleId,
  isFirst,
}: {
  row: ReviewMemberRowData;
  cycleId: string;
  isFirst: boolean;
}) {
  const { execute, isExecuting } = useAction(openMemberReview);
  const status = STATUS[row.status];

  const actionLabel =
    row.status === "completed" ? "View review" : row.status === "in_progress" ? "Continue draft" : "Review now";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        borderTop: isFirst ? "none" : "1px solid rgba(168,175,203,.18)",
      }}
    >
      <Avatar name={row.name} src={row.avatarUrl} size={38} round />

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-strong)" }}>{row.name}</div>
        <div className="piq-caption">{row.jobTitle ?? "—"}</div>
      </div>

      {row.score != null ? (
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>
          {row.score.toFixed(1)}
          <span className="piq-caption"> /5</span>
        </span>
      ) : null}

      <span
        style={{
          padding: "4px 11px",
          borderRadius: 999,
          background: status.bg,
          color: status.color,
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        {status.label}
      </span>

      <Link href={`/members/${row.memberId}`} style={{ textDecoration: "none" }}>
        <Button variant="ghost" size="sm">
          Profile
        </Button>
      </Link>

      {row.reviewId && row.isMine ? (
        <Link href={`/reviews/${row.reviewId}`} style={{ textDecoration: "none" }}>
          <Button size="sm" variant={row.status === "completed" ? "secondary" : "primary"}>
            {actionLabel}
          </Button>
        </Link>
      ) : row.reviewId && row.status === "completed" ? (
        <Link href={`/reviews/${row.reviewId}`} style={{ textDecoration: "none" }}>
          <Button size="sm" variant="secondary">
            View review
          </Button>
        </Link>
      ) : (
        <Button
          size="sm"
          disabled={isExecuting}
          onClick={() => execute({ memberId: row.memberId, cycleId })}
        >
          {isExecuting ? "Opening…" : "Review now"}
        </Button>
      )}
    </div>
  );
}
