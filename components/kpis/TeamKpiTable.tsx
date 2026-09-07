import Link from "next/link";

export interface TeamKpiRow {
  kpiTeamId: string;
  name: string;
  icon: string;
  quantifier: string;
  target: string;
  unit: string;
  currentValue: string | null;
  measurementStatus: "on" | "below" | null;
  hasTarget: boolean;
  weightPct: number;
  avgScore: number | null;
}

const GRID = "1fr 130px 130px 80px 84px";

const STATUS_BADGE: Record<"on" | "below" | "no_target" | "unmeasured", { label: string; color: string; bg: string }> = {
  on: { label: "On target", color: "#273FF9", bg: "rgba(58,99,250,.13)" },
  below: { label: "Below target", color: "#596392", bg: "rgba(89,99,146,.14)" },
  no_target: { label: "No target set", color: "#596392", bg: "rgba(89,99,146,.14)" },
  unmeasured: { label: "Not measured", color: "#596392", bg: "rgba(89,99,146,.14)" },
};

export function TeamKpiTable({ rows }: { rows: TeamKpiRow[] }) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,.20)",
          border: "1px solid rgba(255,255,255,.40)",
          WebkitBackdropFilter: "blur(35px)",
          backdropFilter: "blur(35px)",
          boxShadow: "0 8px 24px rgba(0,0,0,.06)",
          borderRadius: 18,
          padding: 20,
        }}
      >
        <div className="piq-caption">No KPIs yet for this team&rsquo;s active cycle.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: GRID,
          gap: 16,
          padding: "0 20px",
          fontSize: 11,
          fontWeight: 500,
          color: "#767FA5",
          letterSpacing: ".05em",
          textTransform: "uppercase",
        }}
      >
        <div>KPI &amp; quantifier</div>
        <div>Target</div>
        <div>Current</div>
        <div>Weight</div>
        <div style={{ textAlign: "right" }}>Score</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
        {rows.map((row) => {
          const badge =
            STATUS_BADGE[row.measurementStatus ?? (row.currentValue && !row.hasTarget ? "no_target" : "unmeasured")];
          return (
            <div
              key={row.kpiTeamId}
              style={{
                background: "rgba(255,255,255,.20)",
                border: "1px solid rgba(255,255,255,.40)",
                WebkitBackdropFilter: "blur(35px)",
                backdropFilter: "blur(35px)",
                boxShadow: "0 8px 24px rgba(0,0,0,.06)",
                borderRadius: 18,
                padding: "16px 20px",
                display: "grid",
                gridTemplateColumns: GRID,
                gap: 16,
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: "rgba(58,99,250,.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#273FF9",
                    flexShrink: 0,
                  }}
                >
                  <iconify-icon icon={row.icon} width={20} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#181835" }}>{row.name}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#767FA5",
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.quantifier}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>{row.target}</div>
                <div style={{ fontSize: 11, color: "#767FA5" }}>{row.unit}</div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: row.currentValue ? "#181835" : "#A8AFCB",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {row.currentValue ?? "—"}
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "2px 7px",
                    borderRadius: 6,
                    marginTop: 3,
                    color: badge.color,
                    background: badge.bg,
                  }}
                >
                  {badge.label}
                </span>
              </div>

              <div style={{ fontSize: 15, fontWeight: 500, color: "#454D7A", fontVariantNumeric: "tabular-nums" }}>{row.weightPct}%</div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 19, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>
                  {row.avgScore != null ? row.avgScore.toFixed(1) : "—"}
                </span>
                <span style={{ fontSize: 12, color: "#A8AFCB" }}>{row.avgScore != null ? "/5" : " pending"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <Link href="/kpis" style={{ textDecoration: "none" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            marginTop: 14,
            padding: "14px 18px",
            background: "rgba(39,63,249,.07)",
            border: "1px solid rgba(39,63,249,.15)",
            borderRadius: 16,
            cursor: "pointer",
          }}
        >
          <iconify-icon icon="ant-design:bar-chart-outlined" width={18} style={{ color: "#273FF9", flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13, color: "#454D7A", lineHeight: 1.5 }}>
            Open the full KPI manager to record current values and edit targets, weights and quantifiers for this cycle.
          </div>
          <iconify-icon icon="ant-design:arrow-right-outlined" width={16} style={{ color: "#273FF9", flexShrink: 0 }} />
        </div>
      </Link>
    </div>
  );
}
