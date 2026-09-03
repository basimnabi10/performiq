"use client";

import Link from "next/link";

export function TeamPerformanceCard({
  teamId,
  name,
  memberCount,
  avgScore,
  completionPct,
  deltaLabel,
  deltaUp,
  gradient,
  icon,
}: {
  teamId: string;
  name: string;
  memberCount: number;
  avgScore: number | null;
  completionPct: number;
  deltaLabel: string | null;
  deltaUp: boolean;
  gradient: string;
  icon: string;
}) {
  return (
    <Link
      href={`/teams/${teamId}`}
      style={{
        gridColumn: "span 3",
        minWidth: 0,
        display: "block",
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 28,
        padding: 28,
        textDecoration: "none",
        color: "inherit",
        transition: "transform .18s ease, box-shadow .18s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 16px 36px rgba(70,100,190,.16)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,.06)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 500,
              border: "2px solid rgba(255,255,255,.8)",
              width: 68,
              height: 68,
              borderRadius: 20,
              background: `linear-gradient(135deg,${gradient})`,
              flexShrink: 0,
            }}
          >
            <iconify-icon icon={icon} width="30" />
          </span>
          <div>
            <div style={{ fontSize: 21, fontWeight: 500, color: "#181835" }}>{name}</div>
            <div style={{ fontSize: 13, color: "#767FA5", marginTop: 2 }}>{memberCount} members</div>
          </div>
        </div>
        <iconify-icon icon="ant-design:arrow-right-outlined" width="20" style={{ color: "#A8AFCB" }} />
      </div>
      <div style={{ display: "flex", gap: 32, marginTop: 26 }}>
        <div>
          <div style={{ fontSize: 12, color: "#767FA5" }}>Avg performance</div>
          <div style={{ fontSize: 34, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
            {avgScore != null ? avgScore.toFixed(1) : "—"}
            <span style={{ fontSize: 18, color: "#A8AFCB" }}>/5</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#767FA5" }}>Review completion</div>
          <div style={{ fontSize: 34, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
            {completionPct}%
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              padding: "6px 13px",
              borderRadius: 10,
              color: deltaLabel ? "#273FF9" : "#596392",
              background: deltaLabel ? "rgba(58,99,250,.13)" : "rgba(89,99,146,.14)",
              whiteSpace: "nowrap",
            }}
          >
            {deltaLabel ? `${deltaUp ? "▲" : "▼"} ${deltaLabel}` : "No prior cycle"}
          </span>
        </div>
      </div>
      <div style={{ height: 9, borderRadius: 99, background: "rgba(202,205,220,.4)", marginTop: 22 }}>
        <div
          style={{
            width: `${Math.min(100, completionPct)}%`,
            height: "100%",
            borderRadius: 99,
            background: `linear-gradient(90deg,${gradient})`,
          }}
        />
      </div>
    </Link>
  );
}
