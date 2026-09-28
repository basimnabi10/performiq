"use client";

import { useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { KPI_TARGET, type HrPerson } from "@/lib/hr-shape";
import { STATUS, TAG_BASE, deltaLabel, deltaStyle, scorePos } from "./hrStyles";

const CARD: React.CSSProperties = {
  background: "rgba(255,255,255,.55)",
  border: "1px solid rgba(255,255,255,.8)",
  borderRadius: 18,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const LEARNING_STATUS: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * One member's record, read-only.
 *
 * Everything here is already on screen behind the row that opened it — this
 * is the same record in more detail, not a second source. Coaching notes and
 * check-in reasons are absent, and are never sent to this component.
 */
export function HrMemberDrawer({
  person,
  cycleLabel,
  previousLabel,
  onClose,
}: {
  person: HrPerson;
  cycleLabel: string;
  previousLabel: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const status = STATUS[person.state];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(24,24,53,.28)", zIndex: 40 }} />
      <aside
        role="dialog"
        aria-label={`${person.name} — member profile`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(520px,100%)",
          zIndex: 41,
          overflowY: "auto",
          background: "rgba(243,245,255,.94)",
          WebkitBackdropFilter: "blur(35px)",
          backdropFilter: "blur(35px)",
          borderLeft: "1px solid rgba(255,255,255,.8)",
          boxShadow: "-24px 0 60px rgba(24,24,53,.18)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#767FA5", letterSpacing: ".04em", textTransform: "uppercase" }}>
            Member profile · read-only
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.9)", color: "#454D7A", cursor: "pointer" }}
          >
            <iconify-icon icon="ant-design:close-outlined" width="15" />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={person.name} src={person.avatarUrl} size={56} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-.02em", color: "#181835" }}>{person.name}</div>
            <div style={{ fontSize: 13, color: "#596392" }}>{person.jobTitle ?? "No job title set"}</div>
            <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>
              {person.department} · {person.team}
            </div>
          </div>
          <span style={{ ...TAG_BASE, ...status.tag }}>{status.label}</span>
        </div>

        <div style={{ background: "linear-gradient(150deg,#2C3158,#181835)", borderRadius: 20, padding: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 200, height: 200, right: -60, top: -80, borderRadius: "50%", background: "radial-gradient(circle,rgba(58,99,250,.4),transparent 70%)" }} />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, color: "#A8AFCB" }}>Review · {cycleLabel}</div>
              <div style={{ fontSize: 40, fontWeight: 500, letterSpacing: "-.02em", color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1.1, marginTop: 4 }}>
                {person.score != null ? person.score.toFixed(1) : "—"}
                <span style={{ fontSize: 18, color: "#767FA5" }}>/5</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "right" }}>
              <div>
                <div style={{ fontSize: 11, color: "#767FA5" }}>Reviewed by</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{person.reviewerName ?? "Not assigned"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#767FA5" }}>Submitted</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{formatDate(person.submittedAt) ?? "—"}</div>
              </div>
            </div>
          </div>
          {person.state !== "submitted" ? (
            <div style={{ position: "relative", fontSize: 12, color: "#C8CBE1", marginTop: 14, lineHeight: 1.5 }}>
              {person.state === "unassigned"
                ? "No reviewer has been assigned for this cycle, so there is nothing to score yet."
                : person.state === "overdue"
                  ? "This review is past its due date. A score appears once it is submitted."
                  : "This review is still being written. A draft is not a result, so no score is shown."}
            </div>
          ) : null}
        </div>

        <div style={CARD}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>Change vs last cycle</span>
            <span style={deltaStyle(person.delta)}>{deltaLabel(person.delta)}</span>
          </div>
          {person.score != null && person.prevScore != null ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {[
                { label: previousLabel ?? "Previous", value: person.prevScore, strong: false },
                { label: cycleLabel, value: person.score, strong: true },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 72, fontSize: 12, color: "#767FA5" }}>{row.label}</span>
                  <div style={{ flex: 1, height: 10, borderRadius: 99, background: "rgba(202,205,220,.45)", overflow: "hidden" }}>
                    <span
                      style={{
                        display: "block",
                        width: `${scorePos(row.value)}%`,
                        height: "100%",
                        borderRadius: 99,
                        background: row.strong ? "linear-gradient(90deg,#3A63FA,#273FF9)" : "rgba(118,127,165,.55)",
                      }}
                    />
                  </div>
                  <span style={{ width: 30, fontSize: 13, fontWeight: 500, color: row.strong ? "#181835" : "#454D7A", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {row.value.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#767FA5" }}>
              {person.score == null
                ? `Shown once the ${cycleLabel} review is submitted.`
                : previousLabel
                  ? `No score in ${previousLabel} to compare against.`
                  : "This is the first cycle on record, so there is nothing to compare against."}
            </div>
          )}
        </div>

        <div style={CARD}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>KPI breakdown · {cycleLabel}</span>
            <span style={{ fontSize: 11, color: "#767FA5" }}>Target {KPI_TARGET.toFixed(1)} on each KPI</span>
          </div>
          {person.kpis.length === 0 ? (
            <div style={{ fontSize: 12, color: "#767FA5" }}>KPI scores appear once the review is submitted.</div>
          ) : (
            person.kpis.map((k, i) => (
              <div key={`${k.name}-${i}`} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 170, flexShrink: 0, fontSize: 12, color: "#454D7A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={k.name}>
                  {k.name}
                </span>
                <div style={{ flex: 1, position: "relative", height: 8, borderRadius: 99, background: "rgba(202,205,220,.45)" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${(k.rating / 5) * 100}%`,
                      borderRadius: 99,
                      background: k.rating < KPI_TARGET ? "#2C3158" : "linear-gradient(90deg,#3A63FA,#273FF9)",
                    }}
                  />
                  <span style={{ position: "absolute", top: -4, bottom: -4, left: `${(KPI_TARGET / 5) * 100}%`, width: 1.5, background: "#767FA5", borderRadius: 1 }} />
                </div>
                <span style={{ width: 28, fontSize: 12, fontWeight: 500, color: "#181835", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {k.rating.toFixed(1)}
                </span>
              </div>
            ))
          )}
        </div>

        <div style={CARD}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>Learning</span>
          {person.learning.length === 0 ? (
            <div style={{ fontSize: 12, color: "#767FA5" }}>No courses assigned.</div>
          ) : (
            person.learning.map((l, i) => (
              <div key={`${l.course}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>{l.course}</span>
                  <span style={{ fontSize: 12, color: "#596392", whiteSpace: "nowrap" }}>
                    {LEARNING_STATUS[l.status] ?? l.status} · {l.progressPct}%
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "rgba(202,205,220,.45)", overflow: "hidden" }}>
                  <span style={{ display: "block", width: `${l.progressPct}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#3A63FA,#273FF9)" }} />
                </div>
                <span style={{ fontSize: 11, color: "#767FA5" }}>{l.dueDate ? `Due ${formatDate(l.dueDate)}` : "No due date"}</span>
              </div>
            ))
          )}
        </div>

        <div style={{ fontSize: 11, color: "#767FA5", lineHeight: 1.5 }}>
          Read-only. Coaching notes and check-in reasons stay between the member and their HOD.
        </div>
      </aside>
    </>
  );
}
