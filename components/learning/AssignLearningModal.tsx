"use client";

import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
import { assignCourse } from "@/actions/learning";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

export interface AssignCourseOption {
  id: string;
  title: string;
}

export interface AssignTeamOption {
  id: string;
  name: string;
}

export interface AssignMemberOption {
  id: string;
  name: string;
  teamId: string | null;
}

export function AssignLearningModal({
  courses,
  teams,
  members,
  defaultCourseId,
  variant = "primary",
  size,
  triggerLabel = "Assign learning",
  triggerIcon = "ant-design:send-outlined",
}: {
  courses: AssignCourseOption[];
  teams: AssignTeamOption[];
  members: AssignMemberOption[];
  defaultCourseId?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg" | "header";
  triggerLabel?: string;
  triggerIcon?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "done">("form");
  const [courseId, setCourseId] = useState(defaultCourseId ?? courses[0]?.id ?? "");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState("");
  const [doneCount, setDoneCount] = useState(0);

  const { execute, isExecuting, result, reset } = useAction(assignCourse, {
    onSuccess: ({ data }) => {
      setDoneCount(data?.assigned ?? picked.size);
      setStep("done");
      setPicked(new Set());
    },
  });

  const scopeMembers = useMemo(() => members.filter((m) => m.teamId === teamId), [members, teamId]);
  const courseTitle = courses.find((c) => c.id === courseId)?.title ?? "";
  const teamName = teams.find((t) => t.id === teamId)?.name ?? "";

  function close() {
    setOpen(false);
    setStep("form");
    setPicked(new Set());
    setDueDate("");
    reset();
  }

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const summary = picked.size
    ? `"${courseTitle}" will be assigned to ${picked.size} member${picked.size > 1 ? "s" : ""} in ${teamName}, due ${dueDate || "no due date set"}.`
    : "Select one or more members to assign this course.";

  if (!open) {
    return (
      <Button variant={variant} size={size} icon={triggerIcon} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(24,24,53,.42)",
        WebkitBackdropFilter: "blur(3px)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
      onClick={close}
    >
      <div
        style={{
          width: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "rgba(255,255,255,.92)",
          WebkitBackdropFilter: "blur(40px)",
          backdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,.7)",
          borderRadius: 26,
          boxShadow: "0 30px 80px rgba(24,24,53,.4)",
          padding: 30,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <span
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: "linear-gradient(135deg,#3A63FA,#273FF9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 8px 20px rgba(39,63,249,.35)",
              flexShrink: 0,
            }}
          >
            <iconify-icon icon={step === "done" ? "ant-design:check-outlined" : "ant-design:read-outlined"} width="22" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 21, fontWeight: 500, letterSpacing: "-.01em", color: "#181835" }}>
              {step === "done" ? "Assigned" : "Assign learning"}
            </div>
            <div style={{ fontSize: 13, color: "#596392", marginTop: 2 }}>
              {step === "done" ? "The course is on their learning path." : "Assign a course to members of a team."}
            </div>
          </div>
          <IconButton
            icon="ant-design:close-outlined"
            variant="chrome"
            size={34}
            label="Close"
            onClick={close}
            style={{ borderRadius: 10, flexShrink: 0 }}
          />
        </div>

        {step === "form" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              execute({ courseId, memberIds: Array.from(picked), dueDate: dueDate || undefined });
            }}
          >
            <div style={{ marginTop: 22 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Course</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Assign to</label>
              <div style={{ display: "flex", gap: 5, marginTop: 8, padding: 5, background: "rgba(255,255,255,.55)", border: "1px solid rgba(255,255,255,.7)", borderRadius: 13, flexWrap: "wrap" }}>
                {teams.map((t) => {
                  const active = t.id === teamId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTeamId(t.id);
                        setPicked(new Set());
                      }}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        padding: "9px 12px",
                        borderRadius: 9,
                        fontSize: 13,
                        fontWeight: 500,
                        fontFamily: "'Switzer',sans-serif",
                        cursor: "pointer",
                        border: "none",
                        whiteSpace: "nowrap",
                        color: active ? "#fff" : "#596392",
                        background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "transparent",
                        boxShadow: active ? "0 5px 14px rgba(39,63,249,.32)" : "none",
                      }}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Members</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 9 }}>
                {scopeMembers.length === 0 ? (
                  <div className="piq-caption">No members on this team.</div>
                ) : (
                  scopeMembers.map((m) => {
                    const on = picked.has(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggle(m.id)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                          padding: "6px 11px 6px 6px",
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                          color: on ? "#273FF9" : "#454D7A",
                          background: on ? "rgba(58,99,250,.1)" : "rgba(255,255,255,.55)",
                          border: `1.5px solid ${on ? "#273FF9" : "rgba(168,175,203,.35)"}`,
                        }}
                      >
                        <Avatar name={m.name} size={24} style={{ borderRadius: 7, fontSize: 10 }} />
                        {m.name.split(" ")[0]}
                        <iconify-icon icon={on ? "ant-design:check-circle-filled" : "ant-design:plus-circle-outlined"} width="13" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginTop: 18, padding: "13px 15px", background: "rgba(39,63,249,.07)", border: "1px solid rgba(39,63,249,.15)", borderRadius: 13 }}>
              <iconify-icon icon="ant-design:info-circle-outlined" width="16" style={{ color: "#273FF9", marginTop: 1, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: "#454D7A", lineHeight: 1.5 }}>{summary}</div>
            </div>

            {result.serverError ? (
              <div className="piq-caption" style={{ color: "#FF5A5F", marginTop: 12 }}>
                {result.serverError}
              </div>
            ) : null}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 22 }}>
              <Button
                type="button"
                variant="secondary"
                style={{ color: "#454D7A", background: "rgba(255,255,255,.6)", border: "1px solid rgba(168,175,203,.4)" }}
                onClick={close}
              >
                Cancel
              </Button>
              <Button type="submit" icon="ant-design:send-outlined" disabled={isExecuting || picked.size === 0}>
                {isExecuting ? "Assigning…" : "Assign learning"}
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "16px 0 4px" }}>
              <span
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(58,99,250,.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#273FF9",
                }}
              >
                <iconify-icon icon="ant-design:check-circle-filled" width="34" />
              </span>
              <div style={{ fontSize: 19, fontWeight: 500, color: "#181835", marginTop: 16 }}>Learning assigned</div>
              <div style={{ fontSize: 14, color: "#596392", marginTop: 6, lineHeight: 1.55, maxWidth: 400 }}>
                <span style={{ fontWeight: 500, color: "#181835" }}>{courseTitle}</span> was assigned to {doneCount} member
                {doneCount === 1 ? "" : "s"}.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 24 }}>
              <Button
                type="button"
                variant="secondary"
                style={{ color: "#454D7A", background: "rgba(255,255,255,.6)", border: "1px solid rgba(168,175,203,.4)" }}
                onClick={() => setStep("form")}
              >
                Assign more
              </Button>
              <Button type="button" icon="ant-design:check-outlined" onClick={close}>
                View assignments
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 8,
  height: 46,
  padding: "0 15px",
  fontSize: 14,
  color: "#181835",
  background: "rgba(255,255,255,.7)",
  border: "1.5px solid rgba(168,175,203,.4)",
  borderRadius: 12,
  fontFamily: "'Switzer',sans-serif",
  outline: "none",
};
