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
  date: Date;
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

const GRID_COLUMNS = "1fr 100px 190px 70px 130px 40px";

export function ReviewsTable({ rows }: { rows: ReviewRow[] }) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          padding: "40px 20px",
          border: "1.5px dashed rgba(168,175,203,.45)",
          borderRadius: 16,
          color: "#767FA5",
        }}
      >
        <iconify-icon icon="ant-design:inbox-outlined" width={28} />
        <div className="piq-caption">No reviews match these filters.</div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 780 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: GRID_COLUMNS,
            gap: 16,
            padding: "0 18px 10px",
            fontSize: 11,
            fontWeight: 500,
            color: "#767FA5",
            letterSpacing: ".05em",
            textTransform: "uppercase",
          }}
        >
          <div>Member</div>
          <div>Cycle</div>
          <div>Reviewer &amp; date</div>
          <div>Score</div>
          <div>Status</div>
          <div />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/reviews/${r.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: GRID_COLUMNS,
                gap: 16,
                alignItems: "center",
                padding: "14px 18px",
                borderRadius: 16,
                background: "rgba(255,255,255,.35)",
                border: "1px solid rgba(255,255,255,.5)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <Avatar name={r.revieweeName} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>{r.revieweeName}</div>
                  <div className="piq-caption">{r.type === "self" ? "Self review" : r.type === "manager" ? "Manager review" : "Peer review"}</div>
                </div>
              </div>
              <div className="piq-caption">{r.cycleLabel}</div>
              <div className="piq-caption" style={{ minWidth: 0 }}>
                <div style={{ color: "#454D7A" }}>{r.reviewerName}</div>
                <div style={{ fontSize: 11, color: "#A8AFCB", marginTop: 2 }}>
                  {r.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                {r.overallScore != null ? r.overallScore.toFixed(1) : "—"}
              </div>
              <div>
                <Tag tone={STATUS_TONE[r.status]} dot>
                  {STATUS_LABEL[r.status]}
                </Tag>
              </div>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: "rgba(58,99,250,.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#273FF9",
                }}
              >
                <iconify-icon icon={r.status === "completed" ? "ant-design:eye-outlined" : "ant-design:arrow-right-outlined"} width={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
