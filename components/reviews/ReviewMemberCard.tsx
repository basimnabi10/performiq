"use client";

import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { openMemberReview } from "@/actions/reviews";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";

export interface ReviewMemberCardData {
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
  none: { label: "Pending", bg: "rgba(250,173,20,.18)", color: "#8A5D00" },
  pending: { label: "Pending", bg: "rgba(250,173,20,.18)", color: "#8A5D00" },
  in_progress: { label: "Draft saved", bg: "rgba(39,63,249,.12)", color: "#1C10C9" },
  completed: { label: "Submitted", bg: "rgba(47,191,113,.16)", color: "#1B7A48" },
} as const;

/**
 * One person in the review queue.
 *
 * "Review now" goes through a server action rather than a link, because the
 * review may not exist yet: shells are created only for the member and their
 * manager, so an HOD covering another team has nothing to link to. The action
 * creates it and redirects, so the button always does what it says.
 */
export function ReviewMemberCard({ row, cycleId }: { row: ReviewMemberCardData; cycleId: string }) {
  const { execute, isExecuting } = useAction(openMemberReview);
  const status = STATUS[row.status];

  const actionLabel =
    row.status === "completed" ? "View review" : row.status === "in_progress" ? "Continue draft" : "Review now";

  return (
    <FrostCard tone="solid" padding={18} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={row.name} src={row.avatarUrl} size={44} round />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text-strong)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.name}
          </div>
          <div className="piq-caption" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.jobTitle ?? "—"}
          </div>
        </div>
        {row.score != null ? (
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text-strong)",
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
            }}
          >
            {row.score.toFixed(1)}
            <span className="piq-caption"> /5</span>
          </span>
        ) : null}
      </div>

      <span
        style={{
          alignSelf: "flex-start",
          padding: "5px 12px",
          borderRadius: 999,
          background: status.bg,
          color: status.color,
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        {status.label}
      </span>

      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <Link href={`/members/${row.memberId}`} style={{ textDecoration: "none", flex: 1 }}>
          <Button variant="secondary" size="sm" style={{ width: "100%" }}>
            Profile
          </Button>
        </Link>

        {row.reviewId && (row.isMine || row.status === "completed") ? (
          <Link href={`/reviews/${row.reviewId}`} style={{ textDecoration: "none", flex: 1 }}>
            <Button
              size="sm"
              variant={row.status === "completed" ? "secondary" : "primary"}
              style={{ width: "100%" }}
            >
              {actionLabel}
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            disabled={isExecuting}
            onClick={() => execute({ memberId: row.memberId, cycleId })}
            style={{ flex: 1 }}
          >
            {isExecuting ? "Opening…" : "Review now"}
          </Button>
        )}
      </div>
    </FrostCard>
  );
}
