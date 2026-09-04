"use client";

import { useState } from "react";

export interface TrendPoint {
  label: string;
  value: number;
}

export type TrendPeriod = "weekly" | "monthly" | "quarterly" | "annual";

const PERIOD_LABEL: Record<TrendPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

function smoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length < 2) return "";
  if (coords.length === 2) return `M${coords[0].x},${coords[0].y} L${coords[1].x},${coords[1].y}`;
  let d = `M${coords[0].x},${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function AnalyticsTrendChart({
  title,
  periods,
  target,
}: {
  title: string;
  /** One dataset per granularity. Periods without a real source yet pass an
   * empty points array and an explanatory `unavailableNote` — never
   * fabricated data. */
  periods: Record<TrendPeriod, { points: TrendPoint[]; unavailableNote?: string }>;
  target: number | null;
}) {
  const [period, setPeriod] = useState<TrendPeriod>("quarterly");
  const { points, unavailableNote } = periods[period];

  const w = 100;
  const h = 100;
  const chartH = 80;
  const min = 2.5;
  const max = 5;
  const range = max - min;
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: points.length > 1 ? i * stepX : w / 2,
    y: chartH - ((Math.max(min, p.value) - min) / range) * chartH,
    label: p.label,
    value: p.value,
  }));
  const linePath = smoothPath(coords);
  const areaPath = coords.length ? `${linePath} L${coords[coords.length - 1].x},100 L${coords[0].x},100 Z` : "";
  const targetY = target != null ? chartH - ((Math.max(min, target) - min) / range) * chartH : null;
  const last = coords[coords.length - 1];

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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 6, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>Weighted average score out of 5 · real review cycles</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, padding: 4, background: "rgba(255,255,255,.55)", border: "1px solid rgba(168,175,203,.35)", borderRadius: 12 }}>
            {(Object.keys(PERIOD_LABEL) as TrendPeriod[]).map((p) => {
              const active = p === period;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
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
                  {PERIOD_LABEL[p]}
                </button>
              );
            })}
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#454D7A" }}>
            <span style={{ width: 16, height: 3, borderRadius: 2, background: "#273FF9" }} />
            Actual
          </span>
          {target != null ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#454D7A" }}>
              <span style={{ width: 16, height: 0, borderTop: "2px dashed #A8AFCB" }} />
              Target {target.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
      <div style={{ position: "relative", height: 230 }}>
        {points.length > 1 ? (
          <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "calc(100% - 22px)" }}>
            <defs>
              <linearGradient id="anFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="rgba(39,63,249,.22)" />
                <stop offset="1" stopColor="rgba(39,63,249,0)" />
              </linearGradient>
            </defs>
            {[5, 4.5, 4, 3.5, 3, 2.5].map((v) => {
              const y = chartH - ((v - min) / range) * chartH;
              return <line key={v} x1={0} x2={w} y1={y} y2={y} stroke="rgba(168,175,203,.35)" strokeWidth={0.3} vectorEffect="non-scaling-stroke" />;
            })}
            {targetY != null ? (
              <line x1={0} x2={w} y1={targetY} y2={targetY} stroke="#A8AFCB" strokeWidth={0.6} strokeDasharray="2.5 2" vectorEffect="non-scaling-stroke" />
            ) : null}
            <path d={areaPath} fill="url(#anFill)" />
            <path d={linePath} fill="none" stroke="#273FF9" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            {coords.map((c, i) => (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={i === coords.length - 1 ? 2.6 : 1.6}
                fill={i === coords.length - 1 ? "#fff" : "#8BB0FF"}
                stroke="#273FF9"
                strokeWidth={i === coords.length - 1 ? 1.4 : 0}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100% - 22px)", textAlign: "center", padding: "0 20px" }} className="piq-caption">
            {unavailableNote ?? "Not enough closed cycles yet for a trend line."}
          </div>
        )}
        {last ? (
          <div
            style={{
              position: "absolute",
              left: `${(last.x / w) * 100}%`,
              top: 10,
              transform: "translateX(-50%)",
              background: "#fff",
              boxShadow: "0 8px 20px rgba(37,41,68,.16)",
              border: "1px solid rgba(255,255,255,.9)",
              borderRadius: 11,
              padding: "6px 12px",
              fontSize: 13,
              fontWeight: 500,
              color: "#181835",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {last.value.toFixed(1)}
          </div>
        ) : null}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between" }}>
          {coords.map((c, i) => (
            <span key={i} style={{ fontSize: 11, color: i === coords.length - 1 ? "#273FF9" : "#767FA5", fontWeight: i === coords.length - 1 ? 500 : 400 }}>
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
