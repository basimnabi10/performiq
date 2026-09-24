"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { setKpiShareable } from "@/actions/kpis";

export interface KpiDetail {
  kpiId: string;
  name: string;
  description: string | null;
  rubric: string | null;
  categoryName: string | null;
  lifecycle: "draft" | "active";
  /** Listed in the org library for other teams to adopt. */
  shareable: boolean;
  metricType: string;
  direction: string;
  target: string;
  unit: string;
  currentValue: string | null;
  weightPct: number;
  avgScore: number | null;
  ownerName: string | null;
  /** Everyone scored on this KPI in the open month, best first. */
  scores: { memberId: string; name: string; score: number }[];
}

/**
 * KPI detail in a side drawer rather than its own page.
 *
 * Reading a KPI is almost always a comparison — is this weight right next to
 * the others, is this rubric consistent with the rest — so losing the list
 * behind a full page navigation costs more than it gives.
 */
export function KpiDetailDrawer({
  kpi,
  onClose,
  canManage = false,
}: {
  kpi: KpiDetail | null;
  onClose: () => void;
  /** Only admins and HODs can publish a KPI to the library. */
  canManage?: boolean;
}) {
  const router = useRouter();
  const [shared, setShared] = useState(false);
  const share = useAction(setKpiShareable, { onSuccess: () => router.refresh() });
  useEffect(() => {
    if (!kpi) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // A drawer that leaves the page scrolling behind it feels detached from
    // the thing it is describing.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [kpi, onClose]);

  if (!kpi) return null;
  const isShared = share.result.data ? share.result.data.shareable : (shared || kpi.shareable);

  const tone = kpi.lifecycle === "draft"
    ? { label: "Draft", bg: "rgba(250,173,20,.18)", color: "#8A5D00" }
    : { label: "Active", bg: "rgba(47,191,113,.16)", color: "#1B7A48" };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(24,24,53,.45)",
        WebkitBackdropFilter: "blur(3px)",
        backdropFilter: "blur(3px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${kpi.name} details`}
        style={{
          width: "min(460px, 100%)",
          height: "100%",
          overflowY: "auto",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          background: "rgba(255,255,255,.94)",
          WebkitBackdropFilter: "blur(40px) saturate(150%)",
          backdropFilter: "blur(40px) saturate(150%)",
          borderLeft: "1px solid rgba(255,255,255,.8)",
          boxShadow: "-20px 0 50px rgba(24,24,53,.22)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 18, fontWeight: 500, color: "var(--text-strong)" }}>{kpi.name}</span>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: tone.bg, color: tone.color, fontSize: 11.5, fontWeight: 500 }}>
                {tone.label}
              </span>
            </div>
            {kpi.categoryName ? (
              <div className="piq-caption" style={{ marginTop: 4 }}>
                {kpi.categoryName}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ border: "none", background: "transparent", color: "var(--text-tertiary)", cursor: "pointer", lineHeight: 0 }}
          >
            <iconify-icon icon="ant-design:close-outlined" width={18} />
          </button>
        </div>

        {kpi.description ? (
          <p className="piq-body" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>
            {kpi.description}
          </p>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
          <Stat label="Weight on this team" value={`${kpi.weightPct}%`} />
          <Stat label="Target" value={`${kpi.target}${kpi.unit ? ` ${kpi.unit}` : ""}`} />
          <Stat label="Recorded value" value={kpi.currentValue ?? "—"} />
          <Stat label="Average rating" value={kpi.avgScore != null ? `${kpi.avgScore.toFixed(1)}/5` : "—"} />
        </div>

        {kpi.rubric ? (
          <Section title="Rating guidance">
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-body)", whiteSpace: "pre-wrap" }}>{kpi.rubric}</div>
          </Section>
        ) : (
          <Section title="Rating guidance">
            <div className="piq-caption">
              None written. Reviewers are scoring 1–5 on their own judgement, so two managers can rate the same work
              differently.
            </div>
          </Section>
        )}

        <Section title={`Scores this month (${kpi.scores.length})`}>
          {kpi.scores.length === 0 ? (
            <div className="piq-caption">Nobody has been scored on this KPI yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {kpi.scores.map((s) => (
                <div key={s.memberId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text-body)" }}>{s.name}</span>
                  <span style={{ width: 120, height: 6, borderRadius: 999, background: "rgba(168,175,203,.3)", overflow: "hidden" }}>
                    <span style={{ display: "block", width: `${(s.score / 5) * 100}%`, height: "100%", background: "linear-gradient(90deg,#3A63FA,#273FF9)" }} />
                  </span>
                  <span style={{ width: 30, textAlign: "right", fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: "var(--text-strong)" }}>
                    {s.score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {canManage ? (
          <Section title="Organization library">
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isShared}
                disabled={share.isExecuting}
                onChange={(e) => {
                  setShared(e.target.checked);
                  share.execute({ kpiId: kpi.kpiId, shareable: e.target.checked });
                }}
                style={{ marginTop: 3 }}
              />
              <span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-strong)" }}>
                  Share with other teams
                </span>
                <span className="piq-caption" style={{ display: "block", marginTop: 2, lineHeight: 1.5 }}>
                  Puts it in the KPI library so any team can adopt it. They pick their own weight; the wording and
                  target stay shared, so a change here reaches everyone using it.
                </span>
              </span>
            </label>
          </Section>
        ) : null}

        {kpi.ownerName ? <div className="piq-caption">Created by {kpi.ownerName}</div> : null}
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,.6)", border: "1px solid rgba(255,255,255,.75)" }}>
      <div className="piq-caption">{label}</div>
      <div style={{ fontSize: 17, fontWeight: 500, color: "var(--text-strong)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}
