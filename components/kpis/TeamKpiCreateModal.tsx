"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { createTeamKpi } from "@/actions/kpis";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

const METRICS = ["number", "percentage", "rating", "days"] as const;
type Metric = (typeof METRICS)[number];
const UNIT_SYMBOL: Record<Metric, string> = { number: "#", percentage: "%", rating: "/5", days: "d" };
const METRIC_ICON: Record<Metric, string> = {
  number: "ant-design:number-outlined",
  percentage: "ant-design:percentage-outlined",
  rating: "ant-design:star-outlined",
  days: "ant-design:clock-circle-outlined",
};

export interface ExistingKpiRow {
  kpiTeamId: string;
  name: string;
  icon: string;
  weightPct: number;
}

export function TeamKpiCreateModal({
  cycleId,
  teamId,
  teamName,
  existingKpis,
}: {
  cycleId: string;
  teamId: string;
  teamName: string;
  existingKpis: ExistingKpiRow[];
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "done">("form");
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [metric, setMetric] = useState<Metric>("number");
  const [direction, setDirection] = useState<"higher_is_better" | "lower_is_better">("higher_is_better");
  const [target, setTarget] = useState("");
  const [weight, setWeight] = useState("");
  const [touched, setTouched] = useState(false);
  const [weightEdits, setWeightEdits] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{ name: string; weightPct: number } | null>(null);

  const { execute, isExecuting, result, reset } = useAction(createTeamKpi, {
    onSuccess: ({ data }) => {
      if (data) setCreated({ name: data.name, weightPct: data.weightPct });
      setStep("done");
      setWeightEdits({});
    },
  });

  function resetForm() {
    setName("");
    setDetail("");
    setMetric("number");
    setDirection("higher_is_better");
    setTarget("");
    setWeight("");
    setTouched(false);
    setWeightEdits({});
  }

  function close() {
    setOpen(false);
    setStep("form");
    resetForm();
    reset();
  }

  function wOf(row: ExistingKpiRow): number {
    const edit = weightEdits[row.kpiTeamId];
    return edit === undefined ? row.weightPct : parseInt(edit, 10) || 0;
  }

  const existingWeight = existingKpis.reduce((s, r) => s + wOf(r), 0);
  const newWeight = parseInt(weight, 10) || 0;
  const usedTotal = existingWeight + newWeight;
  const over = usedTotal > 100;
  const full = existingWeight >= 100;
  const blocked = over || full;
  const remaining = Math.max(0, 100 - existingWeight);
  const roomAfter = remaining - newWeight;

  const budgetStatus = full
    ? { bg: "#252944", color: "#fff", icon: "ant-design:stop-outlined", label: "Full · 100%" }
    : over
      ? { bg: "#252944", color: "#fff", icon: "ant-design:warning-outlined", label: `Over by ${usedTotal - 100}%` }
      : usedTotal === 100
        ? { bg: "rgba(58,99,250,.13)", color: "#273FF9", icon: "ant-design:check-circle-outlined", label: "Fully allocated · 100%" }
        : { bg: "rgba(58,99,250,.13)", color: "#273FF9", icon: "ant-design:pie-chart-outlined", label: `${100 - usedTotal}% remaining` };
  const budgetNote = full
    ? "Budget full — lower a KPI above to make room"
    : over
      ? `Over by ${usedTotal - 100}% — reduce a weight`
      : roomAfter > 0
        ? `${roomAfter}% will remain`
        : roomAfter === 0 && newWeight > 0
          ? `Uses the last ${newWeight}%`
          : `${remaining}% room for this KPI`;
  const budgetColor = blocked ? "#252944" : usedTotal === 100 ? "#273FF9" : "#596392";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setTouched(true);
      return;
    }
    const w = parseInt(weight, 10) || 10;
    if (existingWeight >= 100 || existingWeight + w > 100) {
      setTouched(true);
      return;
    }
    execute({
      cycleId,
      teamId,
      name: name.trim(),
      detail: detail.trim() || undefined,
      metricType: metric,
      direction,
      targetValue: target.trim() || "—",
      unit: UNIT_SYMBOL[metric],
      weightPct: w,
      weightEdits: existingKpis
        .filter((r) => weightEdits[r.kpiTeamId] !== undefined && wOf(r) !== r.weightPct)
        .map((r) => ({ kpiTeamId: r.kpiTeamId, weightPct: wOf(r) })),
    });
  }

  const targetLabel = target.trim()
    ? `${direction === "lower_is_better" ? "≤ " : "≥ "}${target.trim()}${metric === "percentage" ? "%" : ""}`
    : "its target";
  const summary = `${name.trim() || "This KPI"} will be scored 1–5 against ${targetLabel} at ${parseInt(weight, 10) || 10}% weight in the review.`;

  if (!open) {
    return (
      <Button
        icon="ant-design:plus-outlined"
        onClick={() => {
          resetForm();
          setStep("form");
          setOpen(true);
        }}
      >
        Create KPI
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
          width: 600,
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
            <iconify-icon icon={step === "done" ? "ant-design:check-outlined" : "ant-design:aim-outlined"} width="22" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 21, fontWeight: 500, letterSpacing: "-.01em", color: "#181835" }}>
              {step === "done" ? "KPI created" : "Create KPI"}
            </div>
            <div style={{ fontSize: 13, color: "#596392", marginTop: 2 }}>
              {step === "done" ? "It's now part of this team's review." : `Define a metric for ${teamName} to track this cycle.`}
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
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "11px 14px",
                background: "rgba(58,99,250,.08)",
                border: "1px solid rgba(58,99,250,.15)",
                borderRadius: 12,
                marginTop: 22,
              }}
            >
              <iconify-icon icon="ant-design:bg-colors-outlined" width="16" style={{ color: "#273FF9" }} />
              <span style={{ fontSize: 13, color: "#454D7A" }}>
                KPI for <span style={{ fontWeight: 500, color: "#181835" }}>{teamName}</span>
              </span>
            </div>

            <div style={{ marginTop: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>KPI name</label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setTouched(false);
                }}
                placeholder="e.g. Prototype fidelity score"
                style={inputStyle}
              />
              {touched && !name.trim() ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, fontWeight: 500, color: "#252944" }}>
                  <iconify-icon icon="ant-design:exclamation-circle-outlined" width="13" />
                  Give the KPI a name.
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>KPI detail</label>
              <input
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="What this KPI measures and why it matters this cycle…"
                style={inputStyle}
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Quantifier</label>
              <SegmentedControl
                options={METRICS.map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))}
                value={metric}
                onChange={(v) => {
                  const m = v as Metric;
                  setMetric(m);
                  if (m === "days") setDirection("lower_is_better");
                }}
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Direction</label>
              <SegmentedControl
                options={[
                  { value: "higher_is_better", label: "Higher is better" },
                  { value: "lower_is_better", label: "Lower is better" },
                ]}
                value={direction}
                onChange={(v) => setDirection(v as typeof direction)}
              />
            </div>

            <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Target value</label>
                <div style={{ display: "flex", alignItems: "center", marginTop: 8, height: 46, background: "rgba(255,255,255,.7)", border: "1.5px solid rgba(168,175,203,.4)", borderRadius: 12, overflow: "hidden" }}>
                  <span style={{ padding: "0 13px", fontSize: 14, color: "#767FA5", borderRight: "1px solid rgba(168,175,203,.35)", alignSelf: "stretch", display: "flex", alignItems: "center" }}>
                    {UNIT_SYMBOL[metric]}
                  </span>
                  <input
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="0"
                    style={{ flex: 1, minWidth: 0, height: "100%", border: "none", background: "transparent", padding: "0 13px", fontSize: 14, color: "#181835", fontVariantNumeric: "tabular-nums", outline: "none" }}
                  />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Weight in review</label>
                <div style={{ display: "flex", alignItems: "center", marginTop: 8, height: 46, background: "rgba(255,255,255,.7)", border: "1.5px solid rgba(168,175,203,.4)", borderRadius: 12, overflow: "hidden" }}>
                  <input
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="10"
                    style={{ flex: 1, minWidth: 0, height: "100%", border: "none", background: "transparent", padding: "0 13px", fontSize: 14, color: "#181835", fontVariantNumeric: "tabular-nums", outline: "none" }}
                  />
                  <span style={{ padding: "0 13px", fontSize: 14, color: "#767FA5", borderLeft: "1px solid rgba(168,175,203,.35)", alignSelf: "stretch", display: "flex", alignItems: "center" }}>
                    %
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18, background: "rgba(255,255,255,.5)", border: "1px solid rgba(168,175,203,.3)", borderRadius: 14, padding: "15px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Review weight budget</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "4px 11px",
                    borderRadius: 8,
                    color: budgetStatus.color,
                    background: budgetStatus.bg,
                  }}
                >
                  <iconify-icon icon={budgetStatus.icon} width="12" />
                  {budgetStatus.label}
                </span>
              </div>

              {existingKpis.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {existingKpis.map((row) => (
                    <div key={row.kpiTeamId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 9,
                          background: "rgba(58,99,250,.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#273FF9",
                          flexShrink: 0,
                        }}
                      >
                        <iconify-icon icon={row.icon} width="15" />
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "#454D7A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.name}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", height: 34, background: "rgba(255,255,255,.75)", border: "1.5px solid rgba(168,175,203,.4)", borderRadius: 9, overflow: "hidden", width: 78, flexShrink: 0 }}>
                        <input
                          value={weightEdits[row.kpiTeamId] ?? String(row.weightPct)}
                          onChange={(e) => setWeightEdits((prev) => ({ ...prev, [row.kpiTeamId]: e.target.value }))}
                          style={{ flex: 1, minWidth: 0, height: "100%", border: "none", background: "transparent", padding: "0 10px", fontSize: 13, color: "#181835", fontVariantNumeric: "tabular-nums", textAlign: "right", outline: "none" }}
                        />
                        <span style={{ padding: "0 9px", fontSize: 12, color: "#767FA5", borderLeft: "1px solid rgba(168,175,203,.35)", alignSelf: "stretch", display: "flex", alignItems: "center" }}>
                          %
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="piq-caption">No KPIs on this team yet.</div>
              )}

              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(168,175,203,.3)" }}>
                <span style={{ fontSize: 12, color: "#596392" }}>Allocated</span>
                <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: budgetColor }}>{usedTotal}% / 100%</span>
              </div>
              <div style={{ height: 9, borderRadius: 99, background: "rgba(202,205,220,.45)", marginTop: 10, overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${Math.min(100, existingWeight)}%`, height: "100%", background: "#8BB0FF" }} />
                <div style={{ width: `${Math.min(Math.max(0, 100 - existingWeight), newWeight)}%`, height: "100%", background: "#273FF9" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 11, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#596392" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: "#8BB0FF" }} />
                  {existingKpis.length} existing · {existingWeight}%
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#596392" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: "#273FF9" }} />
                  This KPI · {newWeight}%
                </span>
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 500, color: budgetColor }}>{budgetNote}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginTop: 14, padding: "13px 15px", background: "rgba(39,63,249,.07)", border: "1px solid rgba(39,63,249,.15)", borderRadius: 13 }}>
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
              <Button type="submit" icon="ant-design:plus-outlined" disabled={isExecuting || blocked}>
                {isExecuting ? "Creating…" : "Create KPI"}
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
              <div style={{ fontSize: 19, fontWeight: 500, color: "#181835", marginTop: 16 }}>KPI created</div>
              <div style={{ fontSize: 14, color: "#596392", marginTop: 6, lineHeight: 1.55, maxWidth: 420 }}>
                <span style={{ fontWeight: 500, color: "#181835" }}>{created?.name ?? name}</span> is now a {teamName} KPI ({created?.weightPct ?? weight}% weight).
                It appears as a 1–5 rating row on every {teamName} review form this cycle.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 24 }}>
              <Button
                type="button"
                variant="secondary"
                style={{ color: "#454D7A", background: "rgba(255,255,255,.6)", border: "1px solid rgba(168,175,203,.4)" }}
                onClick={() => {
                  resetForm();
                  setStep("form");
                }}
              >
                Create another
              </Button>
              <Button type="button" icon="ant-design:check-outlined" onClick={close}>
                View KPIs
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 5, marginTop: 8, padding: 5, background: "rgba(255,255,255,.55)", border: "1px solid rgba(255,255,255,.7)", borderRadius: 13 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "9px 0",
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
            {o.label}
          </button>
        );
      })}
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

export { METRIC_ICON };
