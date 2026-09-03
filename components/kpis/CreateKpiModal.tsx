"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { createKpi } from "@/actions/kpis";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

const METRIC_TYPES = ["number", "percentage", "rating", "currency", "days"] as const;
const CADENCES = ["weekly", "monthly", "quarterly"] as const;
const UNIT_SYMBOL: Record<(typeof METRIC_TYPES)[number], string> = {
  number: "#",
  percentage: "%",
  rating: "/5",
  currency: "$",
  days: "d",
};

export interface CreateKpiTeamOption {
  id: string;
  name: string;
  memberCount: number;
  icon: string;
  gradient: string;
}

export function CreateKpiModal({
  cycleId,
  teams,
  defaultTeamId,
  variant = "primary",
  size,
}: {
  cycleId: string;
  teams: CreateKpiTeamOption[];
  /** Pre-checked team when the modal opens (e.g. the team-detail page this button lives on). */
  defaultTeamId?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg" | "header";
}) {
  const [open, setOpen] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(
    () => new Set(defaultTeamId ? [defaultTeamId] : teams[0] ? [teams[0].id] : []),
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metricType, setMetricType] = useState<(typeof METRIC_TYPES)[number]>("rating");
  const [direction, setDirection] = useState<"higher_is_better" | "lower_is_better">("higher_is_better");
  const [targetValue, setTargetValue] = useState("");
  const [cadence, setCadence] = useState<(typeof CADENCES)[number]>("quarterly");
  const [weightPct, setWeightPct] = useState(20);

  const { execute, isExecuting, result, reset } = useAction(createKpi, {
    onSuccess: () => {
      setOpen(false);
      setName("");
      setDescription("");
      setTargetValue("");
    },
  });

  function toggleTeam(id: string) {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedTeamNames = teams.filter((t) => selectedTeamIds.has(t.id)).map((t) => t.name);
  const teamLabel = selectedTeamNames.length ? selectedTeamNames.join(" and ") : "no team selected";
  const unit = UNIT_SYMBOL[metricType];
  const targetLabel = targetValue.trim()
    ? metricType === "currency"
      ? `$${targetValue}`
      : metricType === "percentage"
        ? `${targetValue}%`
        : metricType === "rating"
          ? `${targetValue}/5`
          : targetValue
    : "a target";
  const summary = selectedTeamNames.length
    ? `${teamLabel} will track "${name.trim() || "this KPI"}" toward ${targetLabel}, measured ${cadence} through the active cycle.`
    : "Select at least one team to apply this KPI to.";

  if (!open) {
    return (
      <Button icon="ant-design:plus-outlined" variant={variant} size={size} onClick={() => setOpen(true)}>
        Create KPI
      </Button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(24,24,53,.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
      onClick={() => {
        setOpen(false);
        reset();
      }}
    >
      <div
        style={{
          width: 640,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "rgba(255,255,255,.86)",
          WebkitBackdropFilter: "blur(40px)",
          backdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,.7)",
          borderRadius: 26,
          boxShadow: "0 30px 80px rgba(24,24,53,.4)",
          padding: 30,
          display: "flex",
          flexDirection: "column",
          gap: 14,
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
            <iconify-icon icon="ant-design:aim-outlined" width="22" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 21, fontWeight: 500, letterSpacing: "-.01em", color: "#181835" }}>Create KPI</div>
            <div style={{ fontSize: 13, color: "#596392", marginTop: 2 }}>Define a metric for your team to track this cycle.</div>
          </div>
          <IconButton
            icon="ant-design:close-outlined"
            variant="chrome"
            size={34}
            label="Close"
            onClick={() => setOpen(false)}
            style={{ borderRadius: 10, flexShrink: 0 }}
          />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            execute({
              cycleId,
              name,
              description: description || undefined,
              metricType,
              direction,
              targetValue,
              unit,
              cadence,
              teamWeights: Array.from(selectedTeamIds).map((teamId) => ({ teamId, weightPct })),
            });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          {teams.length > 0 ? (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#767FA5", letterSpacing: ".04em", textTransform: "uppercase" }}>
                Apply to teams
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 11, flexWrap: "wrap" }}>
                {teams.map((t) => {
                  const active = selectedTeamIds.has(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleTeam(t.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        padding: 14,
                        borderRadius: 16,
                        cursor: "pointer",
                        flex: "1 1 220px",
                        background: active ? "rgba(39,63,249,.08)" : "rgba(255,255,255,.5)",
                        border: `1.5px solid ${active ? "#273FF9" : "rgba(255,255,255,.75)"}`,
                      }}
                    >
                      <span
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: `linear-gradient(135deg,${t.gradient})`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          flexShrink: 0,
                        }}
                      >
                        <iconify-icon icon={t.icon} width="18" />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: "#767FA5" }}>{t.memberCount} members</div>
                      </div>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          background: active ? "#273FF9" : "transparent",
                          border: `1.5px solid ${active ? "#273FF9" : "rgba(168,175,203,.6)"}`,
                          opacity: active ? 1 : 0.45,
                        }}
                      >
                        <iconify-icon icon="ant-design:check-outlined" width="12" />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <Field label="KPI name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design review turnaround time"
              required
              style={inputStyle}
            />
          </Field>
          <Field label="Description (optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this KPI measure, and why does it matter this cycle?"
              rows={2}
              style={{ ...inputStyle, height: 74, padding: "12px 15px", resize: "none", lineHeight: 1.5 }}
            />
          </Field>
          <Field label="Metric type">
            <SegmentedControl
              options={METRIC_TYPES.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))}
              value={metricType}
              onChange={(v) => setMetricType(v as typeof metricType)}
            />
          </Field>
          <Field label="Direction">
            <SegmentedControl
              options={[
                { value: "higher_is_better", label: "Higher is better" },
                { value: "lower_is_better", label: "Lower is better" },
              ]}
              value={direction}
              onChange={(v) => setDirection(v as typeof direction)}
            />
          </Field>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ width: 200 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Target value</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginTop: 8,
                  height: 46,
                  background: "rgba(255,255,255,.7)",
                  border: "1.5px solid rgba(168,175,203,.4)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    padding: "0 13px",
                    fontSize: 14,
                    color: "#767FA5",
                    borderRight: "1px solid rgba(168,175,203,.35)",
                    alignSelf: "stretch",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {unit}
                </span>
                <input
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="0"
                  required
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: "100%",
                    border: "none",
                    background: "transparent",
                    padding: "0 13px",
                    fontSize: 14,
                    color: "#181835",
                    fontVariantNumeric: "tabular-nums",
                    outline: "none",
                  }}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>Weight in review (%)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={weightPct}
                onChange={(e) => setWeightPct(Number(e.target.value))}
                required
                style={{ ...inputStyle, marginTop: 8 }}
              />
            </div>
          </div>
          <Field label="Measurement cadence">
            <SegmentedControl
              options={CADENCES.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))}
              value={cadence}
              onChange={(v) => setCadence(v as typeof cadence)}
            />
          </Field>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 11,
              marginTop: 10,
              padding: "14px 16px",
              background: "rgba(39,63,249,.07)",
              border: "1px solid rgba(39,63,249,.15)",
              borderRadius: 14,
            }}
          >
            <iconify-icon icon="ant-design:info-circle-outlined" width="17" style={{ color: "#273FF9", marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: "#454D7A", lineHeight: 1.5 }}>{summary}</div>
          </div>

          {result.serverError ? (
            <div className="piq-caption" style={{ color: "#FF5A5F" }}>
              {result.serverError}
            </div>
          ) : null}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
            <Button
              type="button"
              variant="secondary"
              style={{ color: "#454D7A", background: "rgba(255,255,255,.6)", border: "1px solid rgba(168,175,203,.4)" }}
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" icon="ant-design:plus-outlined" disabled={isExecuting || selectedTeamIds.size === 0}>
              {isExecuting ? "Creating…" : "Create KPI"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label}
      {children}
    </label>
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
  border: "1.5px solid rgba(168,175,203,.4)",
  borderRadius: 12,
  padding: "0 15px",
  height: 46,
  fontFamily: "'Switzer',sans-serif",
  fontSize: 14,
  background: "rgba(255,255,255,.7)",
  outline: "none",
  color: "#181835",
  width: "100%",
};
