"use client";

import type { CSSProperties } from "react";
import { Avatar } from "@/components/ui/Avatar";
import {
  DROP_THRESHOLD,
  KPI_TARGET,
  WELLBEING_MIN_GROUP,
  type HrDashboard,
} from "@/lib/hr-shape";
import {
  AXIS_TICKS,
  GLASS,
  MOOD_COLORS,
  MOOD_LABELS,
  ROW,
  SECTION_LABEL,
  STATUS,
  STATUS_ORDER,
  TAG_BASE,
  TRACK_STYLE,
  fmt1,
  scorePos,
} from "./hrStyles";

const CARD: CSSProperties = { ...GLASS, padding: 20 };
const PANEL: CSSProperties = { ...GLASS, padding: 22, display: "flex", flexDirection: "column", gap: 14 };

function Axis() {
  return (
    <div style={{ flex: 1, position: "relative", height: 14, minWidth: 120 }}>
      <div style={TRACK_STYLE}>
      {AXIS_TICKS.map((t) => (
        <span
          key={t}
          style={{
            position: "absolute",
            left: `${scorePos(t)}%`,
            transform: "translateX(-50%)",
            fontSize: 10,
            color: "#A8AFCB",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {t.toFixed(1)}
        </span>
      ))}
      </div>
    </div>
  );
}

export function HrOverview({
  data,
  onSelect,
}: {
  data: HrDashboard;
  onSelect: (memberId: string) => void;
}) {
  const { people, deptStatus, wellbeing, previousLabel, selectedLabel } = data;

  const submitted = people.filter((p) => p.state === "submitted");
  const inProgress = people.filter((p) => p.state === "in_progress");
  const overdue = people.filter((p) => p.state === "overdue");
  const unassigned = people.filter((p) => p.state === "unassigned");
  const total = people.length;
  const submittedPct = total ? Math.round((submitted.length / total) * 100) : 0;

  const avg = submitted.length ? submitted.reduce((s, p) => s + p.score!, 0) / submitted.length : null;
  // Compared on the people who have a score in both periods — otherwise the
  // "change" would mostly reflect who happened to be reviewed each time.
  const paired = people.filter((p) => p.score != null && p.prevScore != null);
  const avgDelta = paired.length
    ? paired.reduce((s, p) => s + p.score!, 0) / paired.length -
      paired.reduce((s, p) => s + p.prevScore!, 0) / paired.length
    : null;

  const followUps = [...overdue, ...unassigned];

  const drops = people
    .filter((p) => p.delta != null && p.delta <= -DROP_THRESHOLD)
    .sort((a, b) => a.delta! - b.delta!);

  const under = submitted
    .map((p) => ({ person: p, below: p.kpis.filter((k) => k.rating < KPI_TARGET).length }))
    .filter((u) => u.below >= 2 && u.person.kpis.length > 0)
    .sort((a, b) => b.below - a.below);

  const wellbeingReported = wellbeing.filter((w) => w.checkIns > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={SECTION_LABEL}>Cycle health</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 18 }}>
        <div style={CARD}>
          <div style={{ fontSize: 13, color: "#596392" }}>Reviews submitted</div>
          <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: "#181835", margin: "8px 0 10px" }}>
            {submitted.length}
            <span style={{ fontSize: 16, color: "#A8AFCB" }}> of {total}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "rgba(202,205,220,.45)", overflow: "hidden" }}>
            <span style={{ display: "block", width: `${submittedPct}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#3A63FA,#273FF9)" }} />
          </div>
          <div style={{ fontSize: 12, color: "#767FA5", marginTop: 8 }}>{submittedPct}% of members on the platform</div>
        </div>

        <div style={CARD}>
          <div style={{ fontSize: 13, color: "#596392" }}>In progress</div>
          <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: "#181835", margin: "8px 0 6px" }}>
            {inProgress.length}
          </div>
          <div style={{ fontSize: 12, color: "#767FA5" }}>Drafts are not counted as results</div>
        </div>

        <div style={CARD}>
          <div style={{ fontSize: 13, color: "#596392" }}>Overdue</div>
          <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: "#181835", margin: "8px 0 6px" }}>
            {overdue.length}
          </div>
          <div style={{ fontSize: 12, color: "#767FA5" }}>Past the reviewer&rsquo;s due date</div>
        </div>

        <div style={CARD}>
          <div style={{ fontSize: 13, color: "#596392" }}>No reviewer assigned</div>
          <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: "#181835", margin: "8px 0 6px" }}>
            {unassigned.length}
          </div>
          <div style={{ fontSize: 12, color: "#767FA5" }}>Cannot be reviewed this cycle yet</div>
        </div>

        <div
          style={{
            background: "linear-gradient(150deg,#2C3158,#181835)",
            border: "1px solid rgba(255,255,255,.1)",
            boxShadow: "0 8px 24px rgba(24,24,53,.2)",
            borderRadius: 24,
            padding: 20,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", width: 160, height: 160, right: -50, top: -60, borderRadius: "50%", background: "radial-gradient(circle,rgba(58,99,250,.4),transparent 70%)" }} />
          <div style={{ position: "relative", fontSize: 13, color: "#A8AFCB" }}>Average score</div>
          <div style={{ position: "relative", fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: "#fff", margin: "8px 0 6px" }}>
            {fmt1(avg)}
            <span style={{ fontSize: 16, color: "#767FA5" }}>/5</span>
          </div>
          <div style={{ position: "relative", fontSize: 12, color: "#C8CBE1" }}>
            {avg != null ? `Across ${submitted.length} submitted review${submitted.length === 1 ? "" : "s"}` : "Nothing submitted yet"}
          </div>
          <div style={{ position: "relative", fontSize: 12, fontWeight: 500, color: "#8BB0FF", marginTop: 4 }}>
            {avgDelta == null
              ? previousLabel
                ? `No one has a score in both ${previousLabel} and ${selectedLabel}`
                : "No earlier cycle to compare with"
              : `${avgDelta >= 0 ? "▲" : "▼"} ${Math.abs(avgDelta).toFixed(1)} vs ${previousLabel} · same ${paired.length} ${paired.length === 1 ? "person" : "people"}`}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,440px),1fr))", gap: 18 }}>
        <div style={{ ...PANEL, gap: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Review status by department</div>
            <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>Every member due a {selectedLabel} review.</div>
          </div>
          {deptStatus.length === 0 ? (
            <div style={{ fontSize: 13, color: "#767FA5" }}>No departments have been set up yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {deptStatus.map((d) => {
                const segs = STATUS_ORDER.map((s) => ({
                  key: s,
                  n: s === "submitted" ? d.submitted : s === "in_progress" ? d.inProgress : s === "overdue" ? d.overdue : d.unassigned,
                }));
                return (
                  <div key={d.name} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>{d.name}</span>
                        <span style={{ fontSize: 12, color: "#767FA5" }}> · {d.hod ? `HOD ${d.hod}` : "No HOD set"}</span>
                      </div>
                      <span style={{ fontSize: 12, color: "#596392", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {d.total === 0 ? "No members" : `${d.submitted} of ${d.total} submitted`}
                      </span>
                    </div>
                    {d.total === 0 ? (
                      <div style={{ fontSize: 12, color: "#A8AFCB" }}>No members in this department yet</div>
                    ) : (
                    <div style={{ display: "flex", gap: 2, height: 12, borderRadius: 99, overflow: "hidden", background: "rgba(202,205,220,.4)" }}>
                      {segs
                        .filter((g) => g.n > 0)
                        .map((g) => (
                          <span
                            key={g.key}
                            title={`${g.n} ${STATUS[g.key].label.toLowerCase()}`}
                            style={{ width: `${(g.n / Math.max(1, d.total)) * 100}%`, background: STATUS[g.key].color }}
                          />
                        ))}
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: "auto" }}>
            {STATUS_ORDER.map((s) => (
              <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#596392" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS[s].color }} />
                {STATUS[s].label}
              </span>
            ))}
          </div>
        </div>

        <div style={PANEL}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Reviews needing a follow-up</div>
            <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>
              Overdue, or waiting for a reviewer. The name on the right is who to follow up with.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {followUps.map((p) => (
              <button key={p.memberId} onClick={() => onSelect(p.memberId)} style={{ ...ROW, display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", cursor: "pointer", font: "inherit", textAlign: "left", width: "100%" }}>
                <Avatar name={p.name} src={p.avatarUrl} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#181835" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#767FA5" }}>
                    {p.department} · {p.team}
                  </div>
                </div>
                <span style={{ ...TAG_BASE, ...STATUS[p.state].tag }}>{STATUS[p.state].label}</span>
                <span style={{ fontSize: 12, color: "#454D7A", width: 160, textAlign: "right", flexShrink: 0 }}>
                  {p.reviewerName ?? (p.hod ?? "No reviewer set")}
                </span>
              </button>
            ))}
            {followUps.length === 0 ? (
              <div style={{ fontSize: 13, color: "#767FA5", padding: "10px 0" }}>Every review is either submitted or on schedule.</div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ ...SECTION_LABEL, marginTop: 8 }}>Needs attention</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,440px),1fr))", gap: 18 }}>
        <div style={PANEL}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>
              Score dropped{previousLabel ? ` vs ${previousLabel}` : ""}
            </div>
            <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>
              {previousLabel
                ? `Down ${DROP_THRESHOLD.toFixed(1)} or more against ${previousLabel}, among reviews submitted in both.`
                : "There is no earlier cycle to compare this one against yet."}
            </div>
          </div>
          {drops.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 12px" }}>
              <span style={{ width: 190, flexShrink: 0 }} />
              <Axis />
              <span style={{ width: 84, flexShrink: 0 }} />
            </div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {drops.map((p) => {
              const from = scorePos(p.prevScore!);
              const to = scorePos(p.score!);
              return (
                <button key={p.memberId} onClick={() => onSelect(p.memberId)} style={{ ...ROW, display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", cursor: "pointer", font: "inherit", textAlign: "left", width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, width: 190, flexShrink: 0, minWidth: 0 }}>
                    <Avatar name={p.name} src={p.avatarUrl} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#181835", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "#767FA5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.department} · {p.team}
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, position: "relative", height: 22, minWidth: 120 }}>
                    <div style={TRACK_STYLE}>
                    <span style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 2, marginTop: -1, background: "rgba(168,175,203,.35)", borderRadius: 2 }} />
                    <span style={{ position: "absolute", left: `${Math.min(from, to)}%`, width: `${Math.abs(to - from)}%`, top: "50%", height: 3, marginTop: -1.5, background: "#2C3158", borderRadius: 2 }} />
                    <span title={previousLabel ?? "Previous"} style={{ position: "absolute", left: `${from}%`, top: "50%", width: 10, height: 10, marginTop: -5, marginLeft: -5, borderRadius: "50%", background: "#fff", boxShadow: "inset 0 0 0 2px #A8AFCB" }} />
                    <span title={selectedLabel} style={{ position: "absolute", left: `${to}%`, top: "50%", width: 10, height: 10, marginTop: -5, marginLeft: -5, borderRadius: "50%", background: "#181835" }} />
                    </div>
                  </div>
                  <div style={{ width: 84, flexShrink: 0, textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>▼ {Math.abs(p.delta!).toFixed(1)}</div>
                    <div style={{ fontSize: 11, color: "#767FA5", fontVariantNumeric: "tabular-nums" }}>
                      {p.prevScore!.toFixed(1)} → {p.score!.toFixed(1)}
                    </div>
                  </div>
                </button>
              );
            })}
            {drops.length === 0 ? (
              <div style={{ fontSize: 13, color: "#767FA5", padding: "10px 0" }}>
                {previousLabel ? "No submitted review is down on the previous cycle." : "A comparison appears once a second cycle has been reviewed."}
              </div>
            ) : null}
          </div>
          {drops.length > 0 ? (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: "auto" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#596392" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff", boxShadow: "inset 0 0 0 2px #A8AFCB" }} />
                {previousLabel}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#596392" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#181835" }} />
                {selectedLabel}
              </span>
            </div>
          ) : null}
        </div>

        <div style={PANEL}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Under target on several KPIs</div>
            <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>
              Two or more KPIs below the {KPI_TARGET.toFixed(1)} target in a submitted {selectedLabel} review.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {under.map(({ person: p, below }) => (
              <button key={p.memberId} onClick={() => onSelect(p.memberId)} style={{ ...ROW, display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", cursor: "pointer", flexWrap: "wrap", font: "inherit", textAlign: "left", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 180px", minWidth: 0 }}>
                  <Avatar name={p.name} src={p.avatarUrl} size={32} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#181835" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#767FA5" }}>
                      {p.department} · {p.team}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {p.kpis.map((k, i) => (
                    <span
                      key={`${k.name}-${i}`}
                      title={`${k.name} · ${k.rating.toFixed(1)}`}
                      style={{ width: 12, height: 12, borderRadius: 4, background: k.rating < KPI_TARGET ? "#2C3158" : "rgba(58,99,250,.22)" }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: "#454D7A", width: 130, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {below} of {p.kpis.length} under
                </span>
              </button>
            ))}
            {under.length === 0 ? (
              <div style={{ fontSize: 13, color: "#767FA5", padding: "10px 0" }}>No one is under target on more than one KPI.</div>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: "auto" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#596392" }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: "rgba(58,99,250,.22)" }} />
              On target
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#596392" }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: "#2C3158" }} />
              Below target
            </span>
          </div>
        </div>
      </div>

      <div style={{ ...SECTION_LABEL, marginTop: 8 }}>Wellbeing</div>
      <div style={{ ...GLASS, padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Mood check-ins by department</div>
            <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>
              Counts only, aggregated per department. A department with fewer than {WELLBEING_MIN_GROUP} check-ins is not
              shown, and the reason someone writes is never included.
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {MOOD_LABELS.map((l, i) => (
              <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#596392" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: MOOD_COLORS[i] }} />
                {l}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {wellbeingReported.map((w) => (
            <div key={w.name} style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span style={{ width: 150, flexShrink: 0, fontSize: 14, fontWeight: 500, color: "#181835" }}>{w.name}</span>
              {w.suppressed ? (
                <div style={{ flex: 1, minWidth: 180, display: "flex", alignItems: "center", gap: 8, height: 30, padding: "0 12px", borderRadius: 10, border: "1px dashed rgba(168,175,203,.6)", fontSize: 12, color: "#596392" }}>
                  <iconify-icon icon="ant-design:eye-invisible-outlined" width="14" style={{ color: "#767FA5" }} />
                  Too few check-ins to show without identifying people
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 180, display: "flex", gap: 2, height: 14, borderRadius: 99, overflow: "hidden", background: "rgba(202,205,220,.4)" }}>
                    {w.counts.map((n, i) =>
                      n > 0 ? (
                        <span key={i} title={`${n} · ${MOOD_LABELS[i]}`} style={{ width: `${(n / w.checkIns) * 100}%`, background: MOOD_COLORS[i] }} />
                      ) : null,
                    )}
                  </div>
                  <span style={{ width: 80, fontSize: 13, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                    {fmt1(w.avg)}
                    <span style={{ fontSize: 11, color: "#A8AFCB" }}>/5</span>
                  </span>
                  <span style={{ width: 130, fontSize: 12, color: "#767FA5", textAlign: "right" }}>
                    {w.checkIns} from {w.people} {w.people === 1 ? "person" : "people"}
                  </span>
                </>
              )}
            </div>
          ))}
          {wellbeingReported.length === 0 ? (
            <div style={{ fontSize: 13, color: "#767FA5" }}>No one has checked in this month.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
