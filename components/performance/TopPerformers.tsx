import { Avatar } from "@/components/ui/Avatar";
import { FrostCard } from "@/components/ui/FrostCard";

export interface PerformerRow {
  memberId: string;
  name: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  teamName: string | null;
  overall: number | null;
  scoredCount: number;
  kpiCount: number;
}

const PLACES = [
  { label: "1st", ring: "#273FF9", tint: "rgba(39,63,249,.10)" },
  { label: "2nd", ring: "#8BB0FF", tint: "rgba(139,176,255,.14)" },
  { label: "3rd", ring: "#A8AFCB", tint: "rgba(168,175,203,.16)" },
];

/**
 * The top of the combined ranking — one score per person across all their
 * KPIs, weighted by their team's weights.
 *
 * Each card states how many of that person's KPIs were actually scored. A
 * 4.8 from one rating is not the same achievement as a 4.8 across six, and
 * without that number the ranking silently favours whoever was reviewed
 * least.
 */
export function TopPerformers({ rows }: { rows: PerformerRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-tertiary)",
          letterSpacing: ".04em",
          textTransform: "uppercase",
        }}
      >
        Top performers · all KPIs combined
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${rows.length}, minmax(0,1fr))`, gap: 16 }}>
        {rows.map((r, i) => {
          const place = PLACES[i] ?? PLACES[2];
          const partial = r.kpiCount > 0 && r.scoredCount < r.kpiCount;
          return (
            <FrostCard key={r.memberId} tone="solid" padding={18} style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Avatar name={r.name} src={r.avatarUrl} size={48} round />
                <span
                  style={{
                    position: "absolute",
                    bottom: -4,
                    right: -4,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: place.ring,
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  {place.label}
                </span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.name}
                </div>
                <div className="piq-caption" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {[r.jobTitle, r.teamName].filter(Boolean).join(" · ") || "—"}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 500, color: "var(--text-strong)" }}>
                    {r.overall?.toFixed(2)}
                  </span>
                  <span className="piq-caption">/5</span>
                  <span
                    className="piq-caption"
                    style={{
                      marginLeft: "auto",
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: place.tint,
                      color: partial ? "var(--text-body)" : "var(--text-secondary)",
                    }}
                    title={partial ? "Not every KPI for this person has been scored yet." : undefined}
                  >
                    {r.scoredCount}/{r.kpiCount || r.scoredCount} KPIs
                  </span>
                </div>
              </div>
            </FrostCard>
          );
        })}
      </div>
    </div>
  );
}
