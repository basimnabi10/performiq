"use client";

import type { WizardCategory, WizardTeam } from "@/components/kpis/KpiWizard.types";

export const METRIC_TYPES = ["number", "percentage", "rating", "currency", "days"] as const;
export type MetricType = (typeof METRIC_TYPES)[number];

/** The step rail: where you are, and what is still to come. */
export function StepRail({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, label: "Basic info" },
    { n: 2 as const, label: "Weight" },
    { n: 3 as const, label: "Review" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {steps.map((s, i) => {
        const done = step > s.n;
        const current = step === s.n;
        return (
          <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: "50%",
                fontSize: 12,
                fontWeight: 500,
                background: done || current ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "rgba(168,175,203,.25)",
                color: done || current ? "#fff" : "var(--text-secondary)",
              }}
            >
              {done ? <iconify-icon icon="ant-design:check-outlined" width={12} /> : s.n}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: current ? 500 : 400,
                color: current ? "var(--text-strong)" : "var(--text-secondary)",
              }}
            >
              {s.label}
            </span>
            {i < steps.length - 1 ? (
              <span style={{ width: 22, height: 1, background: "rgba(168,175,203,.5)" }} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Live total with the message that tells you what to do about it. */
export function WeightTotalBar({ total }: { total: number }) {
  const ready = total === 100;
  const over = total > 100;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "11px 14px",
        borderRadius: 12,
        background: ready ? "rgba(47,191,113,.12)" : over ? "rgba(255,90,95,.12)" : "rgba(250,173,20,.14)",
        border: `1px solid ${ready ? "rgba(47,191,113,.35)" : over ? "rgba(255,90,95,.35)" : "rgba(250,173,20,.35)"}`,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500, color: ready ? "#1B7A48" : over ? "#A8282C" : "#8A5D00" }}>
        {ready
          ? "Framework ready"
          : over
            ? `Reduce total by ${total - 100}%`
            : `${100 - total}% still unassigned`}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: "var(--text-body)" }}>
        {total}% / 100%
      </span>
    </div>
  );
}

export function CategoryField({
  categories,
  value,
  onChange,
  onCreate,
  creating,
}: {
  categories: WizardCategory[];
  value: string;
  onChange: (v: string) => void;
  onCreate: (name: string) => void;
  creating: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <select className="piq-select" value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }}>
        <option value="">Select category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={creating}
        onClick={() => {
          const name = window.prompt("New category name (e.g. Professionalism)");
          if (name && name.trim().length >= 2) onCreate(name.trim());
        }}
        title="Add a category"
        style={{
          width: 46,
          height: 46,
          borderRadius: 999,
          border: "1px solid rgba(100,116,139,.35)",
          background: "rgba(255,255,255,.6)",
          color: "var(--color-primary)",
          cursor: creating ? "wait" : "pointer",
          flexShrink: 0,
        }}
      >
        <iconify-icon icon="ant-design:plus-outlined" width={15} />
      </button>
    </div>
  );
}

export function TeamPicker({
  teams,
  selected,
  onToggle,
}: {
  teams: WizardTeam[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {teams.map((t) => {
        const on = selected.has(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onToggle(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "11px 13px",
              borderRadius: 13,
              cursor: "pointer",
              textAlign: "left",
              background: on ? "rgba(39,63,249,.09)" : "rgba(255,255,255,.55)",
              border: `1px solid ${on ? "rgba(58,99,250,.45)" : "rgba(255,255,255,.7)"}`,
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: on ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "transparent",
                border: on ? "none" : "1.5px solid rgba(168,175,203,.7)",
                color: "#fff",
              }}
            >
              {on ? <iconify-icon icon="ant-design:check-outlined" width={11} /> : null}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text-strong)" }}>{t.name}</span>
            <span className="piq-caption" style={{ marginLeft: "auto" }}>
              {t.memberCount} {t.memberCount === 1 ? "member" : "members"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
