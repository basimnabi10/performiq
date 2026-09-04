"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { AssignLearningModal, type AssignCourseOption, type AssignMemberOption, type AssignTeamOption } from "@/components/learning/AssignLearningModal";

export interface CourseRow {
  id: string;
  title: string;
  category: string;
  duration: string;
  level: string;
  icon: string;
  assigned: number;
  completed: number;
}

export interface AssignmentRow {
  id: string;
  memberName: string;
  teamName: string;
  courseTitle: string;
  due: string;
  progressPct: number;
  status: "not_started" | "in_progress" | "completed";
}

const STATUS_LABEL: Record<AssignmentRow["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

const STATUS_STYLE: Record<AssignmentRow["status"], { color: string; bg: string }> = {
  not_started: { color: "#fff", bg: "#252944" },
  in_progress: { color: "#596392", bg: "rgba(89,99,146,.16)" },
  completed: { color: "#273FF9", bg: "rgba(58,99,250,.13)" },
};

const STATUS_CHIPS: { label: string; value: "all" | AssignmentRow["status"] }[] = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "In progress", value: "in_progress" },
  { label: "Not started", value: "not_started" },
];

export function LearningExplorer({
  courses,
  assignments,
  teams,
  members,
  canManage,
}: {
  courses: CourseRow[];
  assignments: AssignmentRow[];
  teams: AssignTeamOption[];
  members: AssignMemberOption[];
  canManage: boolean;
}) {
  const [tab, setTab] = useState<"catalog" | "assignments">("catalog");
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AssignmentRow["status"]>("all");

  const courseOptions: AssignCourseOption[] = courses.map((c) => ({ id: c.id, title: c.title }));

  const filteredRows = useMemo(() => {
    return assignments.filter((a) => {
      if (query) {
        const q = query.toLowerCase();
        if (!a.memberName.toLowerCase().includes(q) && !a.courseTitle.toLowerCase().includes(q)) return false;
      }
      if (teamFilter !== "all" && a.teamName !== teamFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      return true;
    });
  }, [assignments, query, teamFilter, statusFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 6, padding: 5, background: "rgba(255,255,255,.45)", border: "1px solid rgba(255,255,255,.65)", borderRadius: 14, width: "fit-content" }}>
        <TabButton active={tab === "catalog"} icon="ant-design:appstore-outlined" label="Course catalog" onClick={() => setTab("catalog")} />
        <TabButton active={tab === "assignments"} icon="ant-design:solution-outlined" label="Assignments" onClick={() => setTab("assignments")} />
      </div>

      {tab === "catalog" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {courses.map((c) => {
            const pct = c.assigned ? Math.round((c.completed / c.assigned) * 100) : 0;
            return (
              <div
                key={c.id}
                style={{
                  background: "rgba(255,255,255,.20)",
                  border: "1px solid rgba(255,255,255,.40)",
                  WebkitBackdropFilter: "blur(35px)",
                  backdropFilter: "blur(35px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,.06)",
                  borderRadius: 20,
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <span
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 13,
                      background: "rgba(58,99,250,.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#273FF9",
                      flexShrink: 0,
                    }}
                  >
                    <iconify-icon icon={c.icon} width="22" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>{c.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "#596392", background: "rgba(89,99,146,.12)", padding: "3px 9px", borderRadius: 7 }}>
                        {c.category}
                      </span>
                      <span style={{ fontSize: 11, color: "#767FA5" }}>
                        <iconify-icon icon="ant-design:clock-circle-outlined" width="12" style={{ verticalAlign: "-2px" }} /> {c.duration}
                      </span>
                      <span style={{ fontSize: 11, color: "#767FA5" }}>· {c.level}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, flexShrink: 0 }}>
                    <Link
                      href={`/learning/${c.id}`}
                      style={{
                        height: 34,
                        padding: "0 13px",
                        font: "500 12px 'Switzer',sans-serif",
                        color: "#fff",
                        background: "linear-gradient(135deg,#3A63FA,#273FF9)",
                        borderRadius: 10,
                        whiteSpace: "nowrap",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 6px 14px rgba(39,63,249,.28)",
                        textDecoration: "none",
                      }}
                    >
                      <iconify-icon icon="ant-design:play-circle-outlined" width="14" />
                      Open
                    </Link>
                    {canManage ? (
                      <AssignLearningModal
                        courses={courseOptions}
                        teams={teams}
                        members={members}
                        defaultCourseId={c.id}
                        variant="secondary"
                        size="sm"
                        triggerLabel="Assign"
                        triggerIcon=""
                      />
                    ) : null}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 7 }}>
                  <span style={{ fontSize: 12, color: "#596392" }}>
                    {c.completed} of {c.assigned} completed
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#273FF9", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 99, background: "rgba(202,205,220,.4)" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#3A63FA,#273FF9)" }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              background: "rgba(255,255,255,.30)",
              border: "1px solid rgba(255,255,255,.5)",
              WebkitBackdropFilter: "blur(30px)",
              backdropFilter: "blur(30px)",
              borderRadius: 16,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 220, height: 42, padding: "0 13px", background: "rgba(255,255,255,.7)", border: "1.5px solid rgba(168,175,203,.4)", borderRadius: 11 }}>
              <iconify-icon icon="ant-design:search-outlined" width="16" style={{ color: "#767FA5" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search member or course…"
                style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", fontSize: 13, color: "#181835", outline: "none" }}
              />
            </div>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              style={{ height: 42, padding: "0 13px", fontSize: 13, color: "#181835", background: "rgba(255,255,255,.7)", border: "1.5px solid rgba(168,175,203,.4)", borderRadius: 11, cursor: "pointer" }}
            >
              <option value="all">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: 5, background: "rgba(255,255,255,.6)", border: "1px solid rgba(255,255,255,.75)", borderRadius: 11 }}>
              {STATUS_CHIPS.map((c) => {
                const active = statusFilter === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setStatusFilter(c.value)}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      border: "none",
                      fontFamily: "'Switzer',sans-serif",
                      color: active ? "#fff" : "#596392",
                      background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "transparent",
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1.4fr 150px 1fr 110px",
              gap: 16,
              padding: "0 20px",
              fontSize: 11,
              fontWeight: 500,
              color: "#767FA5",
              letterSpacing: ".05em",
              textTransform: "uppercase",
            }}
          >
            <div>Member</div>
            <div>Course</div>
            <div>Due</div>
            <div>Progress</div>
            <div>Status</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
            {filteredRows.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "50px 0",
                  background: "rgba(255,255,255,.15)",
                  border: "1px dashed rgba(168,175,203,.4)",
                  borderRadius: 18,
                }}
              >
                <iconify-icon icon="ant-design:inbox-outlined" width="30" style={{ color: "#A8AFCB" }} />
                <div style={{ fontSize: 14, color: "#596392", marginTop: 8 }}>No assignments match these filters.</div>
              </div>
            ) : (
              filteredRows.map((r) => {
                const status = STATUS_STYLE[r.status];
                return (
                  <div
                    key={r.id}
                    style={{
                      background: "rgba(255,255,255,.20)",
                      border: "1px solid rgba(255,255,255,.40)",
                      WebkitBackdropFilter: "blur(35px)",
                      backdropFilter: "blur(35px)",
                      boxShadow: "0 8px 24px rgba(0,0,0,.06)",
                      borderRadius: 16,
                      padding: "14px 20px",
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1.4fr 150px 1fr 110px",
                      gap: 16,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                      <Avatar name={r.memberName} size={36} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#181835", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.memberName}
                        </div>
                        <div style={{ fontSize: 11, color: "#767FA5" }}>{r.teamName}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#454D7A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.courseTitle}</div>
                    <div style={{ fontSize: 13, color: "#596392" }}>{r.due}</div>
                    <div>
                      <div style={{ height: 7, borderRadius: 99, background: "rgba(202,205,220,.4)" }}>
                        <div
                          style={{
                            width: `${r.progressPct}%`,
                            height: "100%",
                            borderRadius: 99,
                            background: r.status === "not_started" ? "linear-gradient(90deg,#A8AFCB,#767FA5)" : "linear-gradient(90deg,#3A63FA,#273FF9)",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: "#767FA5", marginTop: 5, fontVariantNumeric: "tabular-nums" }}>{r.progressPct}%</div>
                    </div>
                    <div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 500,
                          padding: "5px 11px",
                          borderRadius: 8,
                          color: status.color,
                          background: status.bg,
                        }}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
        border: "none",
        fontFamily: "'Switzer',sans-serif",
        color: active ? "#fff" : "#596392",
        background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "transparent",
        boxShadow: active ? "0 6px 16px rgba(39,63,249,.3)" : "none",
      }}
    >
      <iconify-icon icon={icon} width="16" />
      {label}
    </button>
  );
}
