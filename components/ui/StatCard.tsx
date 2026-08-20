import * as React from "react";
import { FrostCard } from "./FrostCard";

export interface StatCardProps {
  /** Metric label, e.g. "Team performance index". */
  label: string;
  /** Primary value — string or number; rendered in tabular figures. */
  value: string | number;
  /** Small unit suffix, e.g. "/5". */
  unit?: string;
  /** Trend value shown in a chip, e.g. "6.2%". */
  trend?: string;
  /** Direction of the trend arrow. */
  trendDir?: "up" | "down";
  /** Iconify icon name for the corner badge. */
  icon?: string;
  /** frost (default) or ink (dark accent cell). */
  tone?: "frost" | "ink";
  style?: React.CSSProperties;
}

/** A KPI stat cell: label, big tabular value, optional trend chip and inline icon. */
export function StatCard({
  label,
  value,
  unit,
  trend,
  trendDir = "up",
  icon,
  tone = "frost",
  style,
}: StatCardProps) {
  const isInk = tone === "ink";
  const trendColor = isInk ? "#8BB0FF" : "#273FF9";
  return (
    <FrostCard tone={tone} style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 14,
            fontWeight: 400,
            color: isInk ? "#A8AFCB" : "#596392",
          }}
        >
          {label}
        </span>
        {icon ? (
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              background: isInk ? "rgba(255,255,255,.1)" : "rgba(58,99,250,.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isInk ? "#8BB0FF" : "#273FF9",
            }}
          >
            <iconify-icon icon={icon} width="17" />
          </span>
        ) : null}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 38,
            fontWeight: 500,
            letterSpacing: "-.02em",
            fontVariantNumeric: "tabular-nums",
            color: isInk ? "#fff" : "#181835",
          }}
        >
          {value}
        </span>
        {unit ? <span style={{ fontSize: 18, color: "#767FA5" }}>{unit}</span> : null}
        {trend ? (
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: trendColor,
              background: isInk ? "rgba(139,176,255,.15)" : "rgba(58,99,250,.12)",
              padding: "4px 9px",
              borderRadius: 8,
            }}
          >
            {trendDir === "up" ? "▲" : "▼"} {trend}
          </span>
        ) : null}
      </div>
    </FrostCard>
  );
}
