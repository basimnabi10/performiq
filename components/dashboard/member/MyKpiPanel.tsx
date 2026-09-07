const METRIC_ICON: Record<string, string> = {
  rating: "ant-design:star-outlined",
  percentage: "ant-design:pie-chart-outlined",
  days: "ant-design:clock-circle-outlined",
  number: "ant-design:bar-chart-outlined",
  currency: "ant-design:dollar-outlined",
};

export interface MyKpiEntry {
  kpiId: string;
  name: string;
  metricType: string;
  targetValue: string;
  score: number;
  onTarget: boolean;
  gapToTarget: number | null;
}

export function MyKpiPanel({ kpis }: { kpis: MyKpiEntry[] }) {
  const attention = kpis.filter((k) => !k.onTarget);

  return (
    <div
      style={{
        gridColumn: "span 6",
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 24,
        padding: 24,
      }}
    >
      <div className="piq-h3" style={{ marginBottom: 4 }}>
        KPI evaluation
      </div>
      <div className="piq-caption" style={{ marginBottom: 18 }}>
        Your score against each KPI this cycle
      </div>

      {kpis.length === 0 ? (
        <div className="piq-caption">No KPIs scored for you yet this cycle.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {kpis.map((k) => (
              <div key={k.kpiId} style={{ padding: 16, background: "rgba(255,255,255,.5)", border: "1px solid rgba(168,175,203,.25)", borderRadius: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "rgba(58,99,250,.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#273FF9",
                      flexShrink: 0,
                    }}
                  >
                    <iconify-icon icon={METRIC_ICON[k.metricType] ?? "ant-design:aim-outlined"} width={16} />
                  </span>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#181835", lineHeight: 1.3 }}>{k.name}</div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>{k.score.toFixed(1)}</span>
                  <span style={{ fontSize: 12, color: "#A8AFCB" }}>/5</span>
                </div>
                <div style={{ fontSize: 11, color: "#767FA5", marginTop: 2 }}>Target {k.targetValue}</div>
                <span
                  style={{
                    display: "inline-flex",
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "3px 9px",
                    borderRadius: 7,
                    marginTop: 8,
                    color: k.onTarget ? "#273FF9" : "#596392",
                    background: k.onTarget ? "rgba(58,99,250,.13)" : "rgba(89,99,146,.14)",
                  }}
                >
                  {k.onTarget ? "On target" : "Below target"}
                </span>
              </div>
            ))}
          </div>

          {attention.length > 0 ? (
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(168,175,203,.25)" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#767FA5", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 12 }}>
                Needs attention
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {attention.map((k) => (
                  <div key={k.kpiId} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#252944" }}>{k.name}</div>
                      <div style={{ height: 5, borderRadius: 99, background: "rgba(202,205,220,.4)", marginTop: 5 }}>
                        <div
                          style={{
                            width: `${Math.min(100, (k.score / 5) * 100)}%`,
                            height: "100%",
                            borderRadius: 99,
                            background: "linear-gradient(90deg,#8BB0FF,#3A63FA)",
                          }}
                        />
                      </div>
                    </div>
                    {k.gapToTarget != null ? (
                      <span style={{ fontSize: 12, color: "#596392", whiteSpace: "nowrap" }}>{k.gapToTarget.toFixed(1)} to target</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
