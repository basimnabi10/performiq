import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { FrostCard } from "@/components/ui/FrostCard";

export interface MatrixKpi {
  id: string;
  name: string;
  unit: string | null;
}

export interface MatrixRow {
  memberId: string;
  name: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  teamName: string | null;
  scores: Record<string, number>;
  scoredCount: number;
  kpiCount: number;
  overall: number | null;
}

/** 1-5 ratings, coloured by band rather than a gradient: five steps read as
 *  five judgements, which is what a rating is. */
function scoreStyle(score: number): { bg: string; color: string } {
  if (score >= 4.5) return { bg: "rgba(47,191,113,.16)", color: "#1B7A48" };
  if (score >= 3.5) return { bg: "rgba(39,63,249,.12)", color: "#1C10C9" };
  if (score >= 2.5) return { bg: "rgba(250,173,20,.18)", color: "#8A5D00" };
  return { bg: "rgba(255,90,95,.16)", color: "#A8282C" };
}

/**
 * Everyone against every KPI, in one grid.
 *
 * The member column is sticky because the whole point is comparing a row to
 * its person: scrolling right through eight KPI columns and losing track of
 * whose row you are on defeats the table.
 *
 * An unscored cell shows a dash, not a zero. Zero is a judgement; "nobody has
 * reviewed this yet" is not, and averaging a missing score as zero would drag
 * a person down for their manager being late.
 */
export function KpiPerformanceMatrix({ kpis, rows }: { kpis: MatrixKpi[]; rows: MatrixRow[] }) {
  if (kpis.length === 0) {
    return (
      <FrostCard tone="solid" padding={22}>
        <div className="piq-body">
          No KPIs are defined for this quarter yet, so there is nothing to score against. Add them from the KPIs page.
        </div>
      </FrostCard>
    );
  }

  return (
    <FrostCard tone="solid" padding={0} style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", minWidth: 640 }}>
          <thead>
            <tr>
              <th className="piq-matrix-head piq-matrix-sticky" style={{ textAlign: "left", minWidth: 220 }}>
                Member
              </th>
              {kpis.map((k) => (
                <th key={k.id} className="piq-matrix-head" style={{ minWidth: 96 }} title={k.name}>
                  {k.name}
                </th>
              ))}
              <th className="piq-matrix-head" style={{ minWidth: 96 }}>
                Overall
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.memberId}>
                <td className="piq-matrix-cell piq-matrix-sticky">
                  <Link
                    href={`/members/${r.memberId}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
                  >
                    <Avatar name={r.name} src={r.avatarUrl} size={32} round />
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: 13.5,
                          fontWeight: 500,
                          color: "var(--text-strong)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.name}
                      </span>
                      <span className="piq-caption" style={{ fontSize: 11.5 }}>
                        {[r.jobTitle, r.teamName].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </span>
                  </Link>
                </td>

                {kpis.map((k) => {
                  const score = r.scores[k.id];
                  if (score == null) {
                    return (
                      <td key={k.id} className="piq-matrix-cell" style={{ textAlign: "center" }}>
                        <span className="piq-caption" title="Not scored yet">
                          —
                        </span>
                      </td>
                    );
                  }
                  const s = scoreStyle(score);
                  return (
                    <td key={k.id} className="piq-matrix-cell" style={{ textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          minWidth: 44,
                          padding: "5px 9px",
                          borderRadius: 9,
                          background: s.bg,
                          color: s.color,
                          fontSize: 13,
                          fontWeight: 500,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {score.toFixed(1)}
                      </span>
                    </td>
                  );
                })}

                <td className="piq-matrix-cell" style={{ textAlign: "center" }}>
                  {r.overall == null ? (
                    <span className="piq-caption">—</span>
                  ) : (
                    <span
                      style={{
                        fontSize: 14.5,
                        fontWeight: 500,
                        color: "var(--text-strong)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                      title={`Weighted across ${r.scoredCount} of ${r.kpiCount || r.scoredCount} KPIs`}
                    >
                      {r.overall.toFixed(2)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FrostCard>
  );
}
