import * as React from "react";
import { FrostCard } from "./FrostCard";

export interface StatCardProps {
  /** Metric label, e.g. "Team performance index". */
  label: string;
  /** Primary value — string or number; rendered in tabular figures. */
  value: string | number;
  /** Small unit suffix, e.g. "/5". */
  unit?: string;
  /** Trend value shown below the number, e.g. "6.2%". */
  trend?: string;
  /** Direction of the trend arrow. */
  trendDir?: "up" | "down";
  /** Plain status label shown below the number, no arrow (e.g. "In progress"). */
  badge?: string;
  /** Iconify icon name for the corner badge. */
  icon?: string;
  /** frost (default) or ink (dark accent cell). */
  tone?: "frost" | "ink";
  style?: React.CSSProperties;
}

/** A KPI stat cell: label, big tabular value, optional trend line and inline icon. */
export function StatCard({
  label,
  value,
  unit,
  trend,
  trendDir = "up",
  badge,
  icon,
  tone = "frost",
  style,
}: StatCardProps) {
  const isInk = tone === "ink";
  const trendColor = isInk ? "#8BB0FF" : "#273FF9";
  const valueStr = String(value);
  const valueFontSize = valueStr.length > 6 ? 20 : valueStr.length > 4 ? 24 : 30;
  return (
    <FrostCard tone={tone} padding={18} style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontFamily: "'Switzer',sans-serif",
            fontSize: 13,
            fontWeight: 400,
            lineHeight: 1.3,
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
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: "'Switzer',sans-serif",
            fontSize: valueFontSize,
            fontWeight: 500,
            letterSpacing: "-.02em",
            fontVariantNumeric: "tabular-nums",
            color: isInk ? "#fff" : "#181835",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </span>
        {unit ? <span style={{ fontSize: 16, color: "#767FA5" }}>{unit}</span> : null}
      </div>
      {trend ? (
        <span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: trendColor }}>
          {trendDir === "up" ? "▲" : "▼"} {trend}
        </span>
      ) : badge ? (
        <span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: isInk ? "#A8AFCB" : "#596392" }}>
          {badge}
        </span>
      ) : null}
    </FrostCard>
  );
}
