"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { HrDashboard, ReviewState } from "@/lib/hr-shape";
import { GLASS, ROW, STATUS, STATUS_ORDER, TAG_BASE, deltaLabel, deltaStyle } from "./hrStyles";

const COLUMNS = "minmax(220px,2fr) minmax(180px,1.5fr) minmax(140px,1.2fr) 120px 70px 90px";

const BANDS = [
  { key: "all", label: "All" },
  { key: "high", label: "4.5 and above", min: 4.5, max: 5.01 },
  { key: "mid", label: "3.5 – 4.5", min: 3.5, max: 4.5 },
  { key: "low", label: "Under 3.5", min: 0, max: 3.5 },
] as const;

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        font: "inherit",
        fontSize: 12,
        fontWeight: 500,
        padding: "6px 12px",
        borderRadius: 9,
        cursor: "pointer",
        whiteSpace: "nowrap",
        color: active ? "#fff" : "#454D7A",
        background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "rgba(255,255,255,.55)",
        border: active ? "1px solid transparent" : "1px solid rgba(168,175,203,.45)",
      }}
    >
      {label}
    </button>
  );
}

export function HrPeopleTab({ data, onSelect }: { data: HrDashboard; onSelect: (memberId: string) => void }) {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState<"all" | ReviewState>("all");
  const [band, setBand] = useState<(typeof BANDS)[number]["key"]>("all");

  const departments = useMemo(
    () => [...new Set(data.people.map((p) => p.department))].sort((a, b) => a.localeCompare(b)),
    [data.people],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const bandDef = BANDS.find((b) => b.key === band);
    return data.people.filter((p) => {
      if (dept !== "all" && p.department !== dept) return false;
      if (status !== "all" && p.state !== status) return false;
      if (bandDef && "min" in bandDef) {
        if (p.score == null || p.score < bandDef.min || p.score >= bandDef.max) return false;
      }
      if (!needle) return true;
      return [p.name, p.email, p.jobTitle, p.team, p.department, p.reviewerName]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle));
    });
  }, [data.people, q, dept, status, band]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...GLASS, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 40,
            padding: "0 13px",
            background: "rgba(255,255,255,.7)",
            border: "1.5px solid rgba(168,175,203,.4)",
            borderRadius: 12,
            maxWidth: 380,
          }}
        >
          <iconify-icon icon="ant-design:search-outlined" width="15" style={{ color: "#A8AFCB" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, role, team or reviewer"
            style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", font: "400 13px 'Switzer',sans-serif", color: "#252944" }}
          />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#767FA5", width: 84 }}>Department</span>
          <Chip label="All" active={dept === "all"} onClick={() => setDept("all")} />
          {departments.map((d) => (
            <Chip key={d} label={d} active={dept === d} onClick={() => setDept(d)} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#767FA5", width: 84 }}>Review</span>
          <Chip label="All" active={status === "all"} onClick={() => setStatus("all")} />
          {STATUS_ORDER.map((s) => (
            <Chip key={s} label={STATUS[s].label} active={status === s} onClick={() => setStatus(s)} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#767FA5", width: 84 }}>Score</span>
          {BANDS.map((b) => (
            <Chip key={b.key} label={b.label} active={band === b.key} onClick={() => setBand(b.key)} />
          ))}
        </div>
      </div>

      <div style={{ ...GLASS, padding: "10px 12px 14px", overflowX: "auto" }}>
        <div style={{ minWidth: 880, display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: COLUMNS,
              gap: 14,
              padding: "10px 12px",
              fontSize: 11,
              fontWeight: 500,
              color: "#767FA5",
              letterSpacing: ".04em",
              textTransform: "uppercase",
            }}
          >
            <span>Member</span>
            <span>Department · team</span>
            <span>Reviewer</span>
            <span>{data.selectedLabel} review</span>
            <span style={{ textAlign: "right" }}>Score</span>
            <span style={{ textAlign: "right" }}>{data.previousLabel ? `vs ${data.previousLabel}` : "Change"}</span>
          </div>

          {rows.map((p) => (
            <button
              key={p.memberId}
              onClick={() => onSelect(p.memberId)}
              style={{ ...ROW, display: "grid", gridTemplateColumns: COLUMNS, gap: 14, alignItems: "center", padding: "10px 12px", cursor: "pointer", font: "inherit", textAlign: "left", width: "100%" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                <Avatar name={p.name} src={p.avatarUrl} size={34} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#181835", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  <span style={{ display: "block", fontSize: 12, color: "#767FA5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.jobTitle ?? "—"}</span>
                </span>
              </span>
              <span style={{ fontSize: 13, color: "#454D7A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.department} · {p.team}
              </span>
              <span style={{ fontSize: 13, color: p.reviewerName ? "#454D7A" : "#A8AFCB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.reviewerName ?? "Not assigned"}
              </span>
              <span>
                <span style={{ ...TAG_BASE, ...STATUS[p.state].tag }}>{STATUS[p.state].label}</span>
              </span>
              <span style={{ fontSize: 15, fontWeight: 500, color: p.score != null ? "#181835" : "#A8AFCB", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {p.score != null ? p.score.toFixed(1) : "—"}
              </span>
              <span style={deltaStyle(p.delta)}>{deltaLabel(p.delta)}</span>
            </button>
          ))}

          {rows.length === 0 ? (
            <div style={{ fontSize: 13, color: "#767FA5", padding: "22px 12px" }}>
              {data.people.length === 0 ? "No one has been added to the organization yet." : "No members match those filters."}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#767FA5" }}>
        Showing {rows.length} of {data.people.length}. Scores only appear once a review is submitted.
      </div>
    </div>
  );
}
