import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";

export interface ReviewRow {
  id: string;
  revieweeId: string;
  revieweeName: string;
  reviewerName: string;
  cycleLabel: string;
  type: "self" | "manager" | "peer";
  status: "draft" | "pending" | "in_progress" | "completed";
  overallScore: number | null;
}

const STATUS_TONE: Record<ReviewRow["status"], "onTrack" | "atRisk" | "neutral" | "complete"> = {
  completed: "complete",
  in_progress: "onTrack",
  pending: "neutral",
  draft: "atRisk",
};

const STATUS_LABEL: Record<ReviewRow["status"], string> = {
  completed: "Completed",
  in_progress: "In progress",
  pending: "Pending",
  draft: "Draft",
};

export function ReviewsTable({ rows }: { rows: ReviewRow[] }) {
  if (rows.length === 0) {
    return <div className="piq-caption">No reviews match these filters.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 620 }}>
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/reviews/${r.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 18px",
              borderRadius: 16,
              background: "rgba(255,255,255,.35)",
              border: "1px solid rgba(255,255,255,.5)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Avatar name={r.revieweeName} size={36} />
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>{r.revieweeName}</div>
              <div className="piq-caption">{r.cycleLabel}</div>
            </div>
            <div className="piq-caption" style={{ width: 160, flexShrink: 0 }}>
              {r.type === "self" ? "Self review" : r.type === "manager" ? "Manager review" : "Peer review"} ·{" "}
              {r.reviewerName}
            </div>
            <div style={{ width: 60, flexShrink: 0, textAlign: "right", fontSize: 14, fontWeight: 500 }}>
              {r.overallScore != null ? r.overallScore.toFixed(1) : "—"}
            </div>
            <div style={{ flexShrink: 0 }}>
              <Tag tone={STATUS_TONE[r.status]} dot>
                {STATUS_LABEL[r.status]}
              </Tag>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
