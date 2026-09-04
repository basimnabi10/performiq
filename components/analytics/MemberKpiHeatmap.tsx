export interface HeatmapData {
  memberNames: string[];
  kpiNames: string[];
  /** cells[memberIndex][kpiIndex] = score or null if unscored */
  cells: (number | null)[][];
}

function cellColor(score: number | null): string {
  if (score == null) return "rgba(168,175,203,.2)";
  if (score >= 4.5) return "#273FF9";
  if (score >= 4) return "rgba(58,99,250,.55)";
  if (score >= 3.5) return "rgba(58,99,250,.28)";
  return "rgba(89,99,146,.22)";
}

export function MemberKpiHeatmap({ data, scopeWord }: { data: HeatmapData; scopeWord: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 20,
        padding: "20px 22px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Member × KPI heatmap</div>
          <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>Spot strengths and gaps across the whole {scopeWord} at once</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "#767FA5" }}>Low</span>
          <span style={{ width: 22, height: 12, borderRadius: 3, background: "rgba(89,99,146,.22)" }} />
          <span style={{ width: 22, height: 12, borderRadius: 3, background: "rgba(58,99,250,.28)" }} />
          <span style={{ width: 22, height: 12, borderRadius: 3, background: "rgba(58,99,250,.55)" }} />
          <span style={{ width: 22, height: 12, borderRadius: 3, background: "#273FF9" }} />
          <span style={{ fontSize: 11, color: "#767FA5" }}>High</span>
        </div>
      </div>

      {data.memberNames.length === 0 || data.kpiNames.length === 0 ? (
        <div className="piq-caption">No scored members yet for this scope.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: `168px repeat(${data.kpiNames.length}, 92px)`, gap: 6, minWidth: "fit-content" }}>
            <div />
            {data.kpiNames.map((k) => (
              <div key={k} style={{ fontSize: 11, fontWeight: 500, color: "#454D7A", textAlign: "center", lineHeight: 1.3, padding: "0 2px" }}>
                {k}
              </div>
            ))}
            {data.memberNames.map((name, mi) => (
              <div key={name} style={{ display: "contents" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#181835", display: "flex", alignItems: "center" }}>{name}</div>
                {data.kpiNames.map((_, ki) => {
                  const score = data.cells[mi]?.[ki] ?? null;
                  return (
                    <div
                      key={ki}
                      style={{
                        height: 34,
                        borderRadius: 8,
                        background: cellColor(score),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: score != null && score >= 4 ? "#fff" : "#252944",
                        fontWeight: 500,
                        fontSize: 12,
                      }}
                    >
                      {score != null ? score.toFixed(1) : "—"}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
