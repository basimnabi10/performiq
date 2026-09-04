"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";

export interface LeaderKpiOption {
  kpiId: string;
  name: string;
}

export interface LeaderEntry {
  memberId: string;
  name: string;
  roleTeam: string;
  score: number;
}

export function LeadersByKpiPanel({
  kpiOptions,
  leaderboards,
}: {
  kpiOptions: LeaderKpiOption[];
  leaderboards: Record<string, LeaderEntry[]>;
}) {
  const [kpiId, setKpiId] = useState(kpiOptions[0]?.kpiId ?? "");
  const entries = useMemo(() => (leaderboards[kpiId] ?? []).slice(0, 6), [leaderboards, kpiId]);

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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Leaders by KPI</div>
          <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>Who performs best on the KPI you pick</div>
        </div>
        {kpiOptions.length > 0 ? (
          <select
            value={kpiId}
            onChange={(e) => setKpiId(e.target.value)}
            style={{
              height: 38,
              padding: "0 12px",
              fontSize: 13,
              color: "#181835",
              background: "rgba(255,255,255,.8)",
              border: "1.5px solid rgba(58,99,250,.3)",
              borderRadius: 11,
              cursor: "pointer",
              maxWidth: 210,
              fontFamily: "'Switzer',sans-serif",
              flexShrink: 0,
            }}
          >
            {kpiOptions.map((k) => (
              <option key={k.kpiId} value={k.kpiId}>
                {k.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {entries.length === 0 ? (
          <div className="piq-caption">No scores yet for this KPI.</div>
        ) : (
          entries.map((l, i) => (
            <Link
              key={l.memberId}
              href={`/members/${l.memberId}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: "rgba(255,255,255,.5)",
                border: "1px solid rgba(168,175,203,.25)",
                borderRadius: 13,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 500,
                  color: i < 3 ? "#fff" : "#596392",
                  background: i < 3 ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "rgba(168,175,203,.28)",
                }}
              >
                {i + 1}
              </span>
              <Avatar name={l.name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#181835", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</div>
                <div style={{ fontSize: 11, color: "#767FA5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.roleTeam}</div>
              </div>
              <div style={{ width: 96 }}>
                <div style={{ height: 8, borderRadius: 4, background: "rgba(168,175,203,.25)", overflow: "hidden" }}>
                  <div style={{ width: `${(l.score / 5) * 100}%`, height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#8BB0FF,#273FF9)" }} />
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums", width: 34, textAlign: "right" }}>
                {l.score.toFixed(1)}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
