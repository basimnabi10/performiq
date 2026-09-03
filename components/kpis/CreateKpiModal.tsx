"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { createKpi } from "@/actions/kpis";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

const METRIC_TYPES = ["number", "percentage", "rating", "currency", "days"] as const;
const CADENCES = ["weekly", "monthly", "quarterly"] as const;

export function CreateKpiModal({
  cycleId,
  teamId,
  variant = "primary",
  size,
}: {
  cycleId: string;
  teamId: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg" | "header";
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metricType, setMetricType] = useState<(typeof METRIC_TYPES)[number]>("rating");
  const [direction, setDirection] = useState<"higher_is_better" | "lower_is_better">("higher_is_better");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
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
          background: "rgba(255,255,255,.9)",
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
            <div style={{ fontSize: 13, color: "#596392", marginTop: 2 }}>
              Define a metric for your team to track this cycle.
            </div>
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
              unit: unit || undefined,
              cadence,
              teamWeights: [{ teamId, weightPct }],
            });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <Field label="KPI name">
            <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
          </Field>
          <Field label="Description (optional)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={inputStyle} />
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Target">
              <input value={targetValue} onChange={(e) => setTargetValue(e.target.value)} required placeholder="e.g. ≥ 4.5" style={inputStyle} />
            </Field>
            <Field label="Unit (optional)">
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. days" style={inputStyle} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Cadence">
              <SegmentedControl
                options={CADENCES.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))}
                value={cadence}
                onChange={(v) => setCadence(v as typeof cadence)}
              />
            </Field>
            <Field label="Weight in review (%)">
              <input
                type="number"
                min={1}
                max={100}
                value={weightPct}
                onChange={(e) => setWeightPct(Number(e.target.value))}
                required
                style={inputStyle}
              />
            </Field>
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
            <Button type="submit" icon="ant-design:plus-outlined" disabled={isExecuting}>
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
  border: "1px solid rgba(255,255,255,.75)",
  borderRadius: 11,
  padding: "10px 14px",
  fontFamily: "'Switzer',sans-serif",
  fontSize: 14,
  background: "rgba(255,255,255,.6)",
  outline: "none",
  color: "#181835",
  width: "100%",
};
