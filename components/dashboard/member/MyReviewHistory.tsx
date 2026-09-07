import Link from "next/link";
import { Tag } from "@/components/ui/Tag";

export interface MyReviewRow {
  id: string;
  cycleLabel: string;
  type: "self" | "manager" | "peer";
  status: "draft" | "pending" | "in_progress" | "completed";
  overallScore: number | null;
}

const STATUS_TONE: Record<MyReviewRow["status"], "onTrack" | "atRisk" | "neutral" | "complete"> = {
  completed: "complete",
  in_progress: "onTrack",
  pending: "neutral",
  draft: "atRisk",
};

export function MyReviewHistory({ reviews }: { reviews: MyReviewRow[] }) {
  return (
    <div
      style={{
        gridColumn: "span 4",
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 24,
        padding: 22,
      }}
    >
      <div className="piq-h3" style={{ marginBottom: 14 }}>
        My reviews
      </div>
      {reviews.length === 0 ? (
        <div className="piq-caption">No review history yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reviews.map((r) => (
            <Link
              key={r.id}
              href={`/reviews/${r.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(255,255,255,.5)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#181835" }}>{r.cycleLabel}</div>
                <div className="piq-caption">{r.type === "self" ? "Self review" : r.type === "manager" ? "Manager review" : "Peer review"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                  {r.overallScore != null ? r.overallScore.toFixed(1) : "—"}
                </span>
                <Tag tone={STATUS_TONE[r.status]} dot>
                  {r.status}
                </Tag>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
