"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";

export interface HrEmployeeRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  empId: string | null;
  location: string | null;
  workType: string | null;
  departmentName: string | null;
  teamName: string | null;
  managerName: string | null;
  role: string;
  /** Whether they have signed in — an invite that was never accepted reads as
   * a gap in the record otherwise. */
  activated: boolean;
  joinedLabel: string | null;
  reviewCount: number;
  averageScore: number | null;
  lastReviewedLabel: string | null;
}

const COLUMNS = "1.7fr 1.2fr 1fr 1fr .8fr .9fr";

export function HrEmployeeTable({ rows, departments }: { rows: HrEmployeeRow[]; departments: string[] }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (department && r.departmentName !== department) return false;
      if (onlyUnreviewed && r.reviewCount > 0) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.empId ?? "").toLowerCase().includes(q) ||
        (r.jobTitle ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, department, onlyUnreviewed]);

  const unreviewed = rows.filter((r) => r.reviewCount === 0).length;

  return (
    <div
      style={{
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 24,
        padding: 22,
      }}
    >
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 0 }}>
          <iconify-icon
            icon="ant-design:search-outlined"
            width="15"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }}
          />
          <input
            className="piq-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, employee ID…"
            style={{ paddingLeft: 38, width: "100%" }}
          />
        </div>
        <select
          className="piq-select"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          style={{ flex: "0 1 200px" }}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {unreviewed > 0 ? (
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "0 14px",
              height: 44,
              borderRadius: 12,
              cursor: "pointer",
              background: onlyUnreviewed ? "rgba(39,63,249,.08)" : "rgba(255,255,255,.5)",
              border: onlyUnreviewed ? "1px solid rgba(39,63,249,.28)" : "1px solid rgba(168,175,203,.35)",
              fontSize: 13,
              color: "var(--text-body)",
              whiteSpace: "nowrap",
            }}
          >
            <input
              type="checkbox"
              checked={onlyUnreviewed}
              onChange={(e) => setOnlyUnreviewed(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: "#273FF9", cursor: "pointer" }}
            />
            Never reviewed ({unreviewed})
          </label>
        ) : null}
      </div>

      <div className="piq-caption" style={{ marginTop: 12 }}>
        Showing {visible.length} of {rows.length}.
      </div>

      {visible.length === 0 ? (
        <div className="piq-caption" style={{ marginTop: 18 }}>
          Nobody matches that.
        </div>
      ) : (
        <div style={{ marginTop: 16, overflowX: "auto" }}>
          <div style={{ minWidth: 900 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: COLUMNS,
                gap: 14,
                padding: "0 14px 10px",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-secondary)",
                letterSpacing: ".05em",
                textTransform: "uppercase",
              }}
            >
              <div>Employee</div>
              <div>Department · team</div>
              <div>Manager</div>
              <div>Joined</div>
              <div>Reviews</div>
              <div style={{ textAlign: "right" }}>Average</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visible.map((r) => (
                <Link
                  key={r.id}
                  href={`/hr/employees/${r.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: COLUMNS,
                    gap: 14,
                    alignItems: "center",
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "rgba(255,255,255,.5)",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <Avatar name={r.name} src={r.avatarUrl} size={32} round />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "var(--text-strong)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.name}
                        {!r.activated ? (
                          <span className="piq-caption" style={{ marginLeft: 8, fontWeight: 400 }}>
                            invite pending
                          </span>
                        ) : null}
                      </div>
                      <div
                        className="piq-caption"
                        style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {r.jobTitle ?? r.email}
                        {r.empId ? ` · ${r.empId}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="piq-caption">
                    {r.departmentName ?? "—"}
                    {r.teamName ? ` · ${r.teamName}` : ""}
                  </div>
                  <div className="piq-caption">{r.managerName ?? "—"}</div>
                  <div className="piq-caption">{r.joinedLabel ?? "—"}</div>
                  <div className="piq-caption" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {r.reviewCount === 0 ? "None yet" : r.reviewCount}
                    {r.lastReviewedLabel ? (
                      <span style={{ display: "block" }}>last {r.lastReviewedLabel}</span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      fontSize: 16,
                      fontWeight: 500,
                      color: "var(--text-strong)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {r.averageScore != null ? r.averageScore.toFixed(1) : "—"}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
