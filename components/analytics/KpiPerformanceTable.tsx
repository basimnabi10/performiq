"use client";

import { useMemo, useState } from "react";

export interface KpiPerformanceRow {
  kpiId: string;
  icon: string;
  name: string;
  statusLabel: string;
  statusTone: "on" | "below" | "new";
  target: string;
  current: string;
  avgScore: number | null;
  weight: number;
  contribution: number | null;
}

export function KpiPerformanceTable({ rows }: { rows: KpiPerformanceRow[] }) {
  const [sort, setSort] = useState<"weight" | "score">("weight");

  const sorted = useMemo(() => {
    return rows.slice().sort((a, b) => (sort === "weight" ? b.weight - a.weight : (b.avgScore ?? 0) - (a.avgScore ?? 0)));
  }, [rows, sort]);

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
          <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>KPI performance</div>
          <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>Score against target per KPI, weighted contribution to the overall result</div>
        </div>
        <div style={{ display: "flex", gap: 4, padding: 4, background: "rgba(255,255,255,.55)", border: "1px solid rgba(168,175,203,.35)", borderRadius: 11, flexShrink: 0 }}>
          {(["weight", "score"] as const).map((s) => {
            const active = sort === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 9,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "none",
                  whiteSpace: "nowrap",
                  fontFamily: "'Switzer',sans-serif",
                  color: active ? "#fff" : "#596392",
                  background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "transparent",
                  boxShadow: active ? "0 5px 14px rgba(39,63,249,.32)" : "none",
                }}
              >
                {s === "weight" ? "By weight" : "By score"}
              </button>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="piq-caption">No KPIs yet for this scope.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowX: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(200px,2.2fr) 100px minmax(140px,2fr) 84px 96px",
              gap: 14,
              padding: "0 12px 8px",
              fontSize: 11,
              fontWeight: 500,
              color: "#767FA5",
              letterSpacing: ".04em",
              textTransform: "uppercase",
              minWidth: 720,
            }}
          >
            <div>KPI</div>
            <div>Target</div>
            <div>Score vs target</div>
            <div>Weight</div>
            <div style={{ textAlign: "right" }}>Contribution</div>
          </div>
          {sorted.map((r) => {
            const pct = r.avgScore != null ? Math.min(100, (r.avgScore / 5) * 100) : 0;
            const good = r.avgScore != null && r.statusTone === "on";
            const statusColor = r.statusTone === "below" ? "#8A6D00" : "#273FF9";
            const statusBg = r.statusTone === "below" ? "rgba(199,140,0,.14)" : "rgba(58,99,250,.13)";
            return (
              <div
                key={r.kpiId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(200px,2.2fr) 100px minmax(140px,2fr) 84px 96px",
                  gap: 14,
                  alignItems: "center",
                  padding: 12,
                  background: "rgba(255,255,255,.5)",
                  border: "1px solid rgba(168,175,203,.25)",
                  borderRadius: 14,
                  minWidth: 720,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "rgba(58,99,250,.12)",
                      color: "#273FF9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <iconify-icon icon={r.icon} width="16" />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#181835", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                    <div style={{ display: "inline-flex", fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 6, marginTop: 3, color: statusColor, background: statusBg }}>
                      {r.statusLabel}
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#252944", fontVariantNumeric: "tabular-nums" }}>{r.target}</div>
                  <div style={{ fontSize: 11, color: "#767FA5" }}>now {r.current}</div>
                </div>
                <div>
                  <div style={{ height: 10, borderRadius: 5, background: "rgba(168,175,203,.25)", position: "relative", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 5, background: good ? "linear-gradient(90deg,#3A63FA,#273FF9)" : "linear-gradient(90deg,#8BB0FF,#5883FB)" }} />
                    <div style={{ position: "absolute", left: "90%", top: -3, bottom: -3, width: 2, background: "rgba(89,99,146,.5)" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#767FA5", marginTop: 4 }}>{r.avgScore != null ? `${r.avgScore.toFixed(1)} / 5` : "not scored yet"}</div>
                </div>
                <div style={{ fontSize: 13, color: "#252944", fontVariantNumeric: "tabular-nums" }}>{r.weight}%</div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>
                    {r.contribution != null ? `${r.contribution}%` : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "#767FA5" }}>of {r.weight}%</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
