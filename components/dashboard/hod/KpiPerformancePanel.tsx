"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";

export interface KpiPanelLeader {
  memberId: string;
  name: string;
  score: number;
}

export interface KpiPanelEntry {
  kpiId: string;
  name: string;
  icon: string;
  quantifier: string;
  target: string;
  teamAvg: number | null;
  leaders: KpiPanelLeader[];
}

export function KpiPerformancePanel({ kpis }: { kpis: KpiPanelEntry[] }) {
  const [selectedId, setSelectedId] = useState(kpis[0]?.kpiId ?? "");
  const selected = kpis.find((k) => k.kpiId === selectedId) ?? kpis[0];

  if (!selected) {
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
          padding: 22,
        }}
      >
        <div className="piq-caption">No KPIs scored yet this cycle.</div>
      </div>
    );
  }

  const maxScore = Math.max(1, ...selected.leaders.map((l) => l.score));

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
        padding: 22,
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {kpis.map((k) => {
          const active = k.kpiId === selected.kpiId;
          return (
            <button
              key={k.kpiId}
              onClick={() => setSelectedId(k.kpiId)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 500,
                padding: "7px 13px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                color: active ? "#fff" : "#596392",
                background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "rgba(255,255,255,.5)",
              }}
            >
              <iconify-icon icon={k.icon} width="14" />
              {k.name}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            background: "rgba(58,99,250,.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#273FF9",
            flexShrink: 0,
          }}
        >
          <iconify-icon icon={selected.icon} width="21" />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>{selected.name}</div>
          <div style={{ fontSize: 12, color: "#767FA5", marginTop: 1 }}>
            {selected.quantifier} · target {selected.target}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#767FA5" }}>Team avg</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>
            {selected.teamAvg != null ? selected.teamAvg.toFixed(1) : "—"}
            <span style={{ fontSize: 12, color: "#A8AFCB" }}>/5</span>
          </div>
        </div>
      </div>

      {selected.leaders.length === 0 ? (
        <div className="piq-caption">No scores recorded for this KPI yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 32px" }}>
          {selected.leaders.map((m, i) => (
            <div key={m.memberId} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ width: 20, fontSize: 12, fontWeight: 500, color: "#A8AFCB", fontVariantNumeric: "tabular-nums" }}>
                {i + 1}
              </span>
              <Avatar name={m.name} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#252944", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.name}
                </div>
                <div style={{ height: 5, borderRadius: 99, background: "rgba(202,205,220,.4)", marginTop: 5 }}>
                  <div
                    style={{
                      width: `${(m.score / maxScore) * 100}%`,
                      height: "100%",
                      borderRadius: 99,
                      background: "linear-gradient(90deg,#8BB0FF,#3A63FA)",
                    }}
                  />
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>
                {m.score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
