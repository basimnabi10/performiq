import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { FrostCard } from "@/components/ui/FrostCard";
import { reviewStatusTone } from "@/lib/review-status";
import type { ReviewRow } from "@/components/reviews/ReviewsTable";

const TYPE_LABEL: Record<ReviewRow["type"], string> = {
  self: "Self review",
  manager: "Manager review",
  peer: "Peer review",
};

/**
 * The card view of the same rows the table shows.
 *
 * Cards suit working through people one at a time; the table suits scanning
 * scores down a column. Both read from the same ReviewRow so the two views
 * can never disagree about a review's state.
 */
export function ReviewsGrid({ rows }: { rows: ReviewRow[] }) {
  if (rows.length === 0) {
    return (
      <FrostCard tone="solid" padding={22}>
        <div className="piq-body">No reviews match these filters.</div>
      </FrostCard>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(310px,1fr))", gap: 16 }}>
      {rows.map((r) => {
        const tone = reviewStatusTone(r.status, r.cycleEnd);
        return (
          <Link key={r.id} href={`/reviews/${r.id}`} style={{ textDecoration: "none" }}>
            <FrostCard
              tone="solid"
              padding={18}
              style={{ display: "flex", flexDirection: "column", gap: 13, height: "100%" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <Avatar name={r.revieweeName} size={40} round />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14.5,
                      fontWeight: 500,
                      color: "var(--text-strong)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.revieweeName}
                  </div>
                  <div className="piq-caption">{TYPE_LABEL[r.type]}</div>
                </div>
                {r.overallScore != null ? (
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: "var(--text-strong)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {r.overallScore.toFixed(1)}
                    <span className="piq-caption"> /5</span>
                  </span>
                ) : null}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "4px 11px",
                    borderRadius: 999,
                    background: tone.bg,
                    color: tone.color,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {tone.label}
                </span>
                <span className="piq-caption">{r.cycleLabel}</span>
              </div>

              <div className="piq-caption" style={{ marginTop: "auto" }}>
                Reviewer · {r.reviewerName}
              </div>
            </FrostCard>
          </Link>
        );
      })}
    </div>
  );
}
