export interface HeatmapData {
  memberNames: string[];
  kpiNames: string[];
  /** cells[memberIndex][kpiIndex] = score or null if unscored */
  cells: (number | null)[][];
}

function cellColor(score: number | null): string {
  if (score == null) return "rgba(168,175,203,.2)";
  if (score >= 4.5) return "rgba(39,63,249,.9)";
  if (score >= 4) return "rgba(58,99,250,.65)";
  if (score >= 3.5) return "rgba(139,176,255,.55)";
  return "rgba(168,175,203,.45)";
}

export function MemberKpiHeatmap({ data }: { data: HeatmapData }) {
  if (data.memberNames.length === 0 || data.kpiNames.length === 0) {
    return <div className="piq-caption">No scored members yet for this scope.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "separate", borderSpacing: 4, fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", minWidth: 140 }} />
            {data.kpiNames.map((k) => (
              <th key={k} className="piq-caption" style={{ fontWeight: 400, padding: "0 6px", minWidth: 70 }}>
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.memberNames.map((name, mi) => (
            <tr key={name}>
              <td style={{ fontSize: 13, paddingRight: 10, whiteSpace: "nowrap" }}>{name}</td>
              {data.kpiNames.map((_, ki) => {
                const score = data.cells[mi]?.[ki] ?? null;
                return (
                  <td key={ki}>
                    <div
                      style={{
                        width: 56,
                        height: 32,
                        borderRadius: 8,
                        background: cellColor(score),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: score != null && score >= 4 ? "#fff" : "#454D7A",
                        fontWeight: 500,
                      }}
                    >
                      {score != null ? score.toFixed(1) : "—"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
