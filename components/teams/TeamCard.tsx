"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

export interface TeamCardMember {
  id: string;
  name: string;
}

export function TeamCard({
  teamId,
  name,
  leadName,
  memberCount,
  members,
  avgScore,
  kpiCount,
  completionPct,
  deltaLabel,
  deltaUp,
  gradient,
  shadowColor,
  icon,
}: {
  teamId: string;
  name: string;
  leadName: string | null;
  memberCount: number;
  members: TeamCardMember[];
  avgScore: number | null;
  kpiCount: number;
  completionPct: number;
  deltaLabel: string | null;
  deltaUp: boolean;
  gradient: string;
  shadowColor: string;
  icon: string;
}) {
  const visibleMembers = members.slice(0, 3);
  const overflow = memberCount - visibleMembers.length;

  return (
    <Link
      href={`/teams/${teamId}`}
      style={{
        display: "block",
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 24,
        padding: 26,
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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: `linear-gradient(135deg,${gradient})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: `0 8px 20px ${shadowColor}`,
              flexShrink: 0,
            }}
          >
            <iconify-icon icon={icon} width="24" />
          </span>
          <div>
            <div style={{ fontSize: 19, fontWeight: 500, color: "#181835" }}>{name}</div>
            <div style={{ fontSize: 13, color: "#767FA5", marginTop: 1 }}>
              {memberCount} members{leadName ? ` · ${leadName}, lead` : ""}
            </div>
          </div>
        </div>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "rgba(58,99,250,.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#273FF9",
            flexShrink: 0,
          }}
        >
          <iconify-icon icon="ant-design:arrow-right-outlined" width="16" />
        </span>
      </div>

      <div style={{ display: "flex", gap: 30, marginTop: 22 }}>
        <div>
          <div style={{ fontSize: 11, color: "#767FA5" }}>Team score</div>
          <div style={{ fontSize: 24, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
            {avgScore != null ? avgScore.toFixed(1) : "—"}
            <span style={{ fontSize: 13, color: "#A8AFCB" }}>/5</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#767FA5" }}>KPIs</div>
          <div style={{ fontSize: 24, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{kpiCount}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#767FA5" }}>Review completion</div>
          <div style={{ fontSize: 24, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
            {completionPct}%
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", marginTop: 20 }}>
        {visibleMembers.map((m, i) => (
          <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
            <Avatar name={m.name} size={32} style={{ border: "2px solid rgba(255,255,255,.9)" }} />
          </div>
        ))}
        {overflow > 0 ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#454D7A",
              fontWeight: 500,
              border: "2px solid rgba(255,255,255,.9)",
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "rgba(255,255,255,.85)",
              fontSize: 11,
              marginLeft: -8,
            }}
          >
            +{overflow}
          </span>
        ) : null}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            fontWeight: 500,
            color: deltaLabel ? "#273FF9" : "#596392",
            background: deltaLabel ? "rgba(58,99,250,.13)" : "rgba(89,99,146,.14)",
            padding: "5px 11px",
            borderRadius: 8,
            whiteSpace: "nowrap",
          }}
        >
          {deltaLabel ? `${deltaUp ? "▲" : "▼"} ${deltaLabel} vs last cycle` : "No prior cycle"}
        </span>
      </div>
    </Link>
  );
}
