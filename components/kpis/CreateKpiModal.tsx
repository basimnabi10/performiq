"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { createKpi } from "@/actions/kpis";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";

const METRIC_TYPES = ["number", "percentage", "rating", "currency", "days"] as const;
const CADENCES = ["weekly", "monthly", "quarterly"] as const;

export function CreateKpiModal({ cycleId, teamId }: { cycleId: string; teamId: string }) {
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
      <Button icon="ant-design:plus-outlined" onClick={() => setOpen(true)}>
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
      <FrostCard
        tone="solid"
        style={{ width: 480, display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="piq-h3">Create KPI</span>
          <IconButton icon="ant-design:close-outlined" variant="chrome" size={32} label="Close" onClick={() => setOpen(false)} />
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Metric type">
              <select value={metricType} onChange={(e) => setMetricType(e.target.value as typeof metricType)} style={inputStyle}>
                {METRIC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Direction">
              <select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)} style={inputStyle}>
                <option value="higher_is_better">Higher is better</option>
                <option value="lower_is_better">Lower is better</option>
              </select>
            </Field>
          </div>
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
              <select value={cadence} onChange={(e) => setCadence(e.target.value as typeof cadence)} style={inputStyle}>
                {CADENCES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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

          <Button type="submit" disabled={isExecuting} style={{ width: "100%" }}>
            {isExecuting ? "Creating…" : "Create KPI"}
          </Button>
        </form>
      </FrostCard>
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

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.75)",
  borderRadius: 11,
  padding: "10px 14px",
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 14,
  background: "rgba(255,255,255,.6)",
  outline: "none",
  color: "#181835",
  width: "100%",
};
