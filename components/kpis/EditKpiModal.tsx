"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { updateKpi } from "@/actions/kpis";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";
import { FormError } from "@/components/ui/FormMessage";
import type { WizardCategory } from "@/components/kpis/KpiWizard.types";

export interface EditableKpi {
  kpiId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  rubric: string | null;
  shareable: boolean;
}

/**
 * Edits what a KPI *is*. Weight is deliberately absent: a KPI carries a
 * different weight on every team that uses it, and each of those has its own
 * 100% budget to fit into, so weights are changed per team rather than here.
 */
export function EditKpiModal({
  kpi,
  categories,
  onClose,
}: {
  kpi: EditableKpi;
  categories: WizardCategory[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(kpi.name);
  const [description, setDescription] = useState(kpi.description ?? "");
  const [categoryId, setCategoryId] = useState(kpi.categoryId ?? "");
  const [rubric, setRubric] = useState(kpi.rubric ?? "");
  const [shareable, setShareable] = useState(kpi.shareable);

  const save = useAction(updateKpi, {
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });

  const valid = name.trim().length >= 2;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(24,24,53,.55)",
        WebkitBackdropFilter: "blur(3px)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        textAlign: "left",
      }}
    >
      <FrostCard
        tone="modal"
        padding={26}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="piq-caption" style={{ textTransform: "uppercase", letterSpacing: ".04em" }}>
              Edit KPI
            </div>
            <div className="piq-h3" style={{ marginTop: 2 }}>
              {kpi.name}
            </div>
          </div>
          <IconButton icon="ant-design:close-outlined" aria-label="Close" onClick={onClose} />
        </div>

        <Field label="KPI name *">
          <input className="piq-input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Short description">
          <textarea
            className="piq-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What does this KPI measure and how should reviewers score it?"
            style={{ height: "auto", padding: "12px 14px", resize: "vertical", lineHeight: 1.5 }}
          />
        </Field>

        <Field label="Category (optional)">
          <select className="piq-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Rating guidance (optional)">
          <textarea
            className="piq-input"
            value={rubric}
            onChange={(e) => setRubric(e.target.value)}
            rows={3}
            placeholder="What does a 1 look like, and what does a 5 look like? Reviewers see this while scoring."
            style={{ height: "auto", padding: "12px 14px", resize: "vertical", lineHeight: 1.5 }}
          />
        </Field>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 11,
            padding: "13px 15px",
            borderRadius: 14,
            cursor: "pointer",
            background: shareable ? "rgba(39,63,249,.07)" : "rgba(255,255,255,.45)",
            border: shareable ? "1px solid rgba(39,63,249,.28)" : "1px solid rgba(168,175,203,.35)",
          }}
        >
          <input
            type="checkbox"
            checked={shareable}
            onChange={(e) => setShareable(e.target.checked)}
            style={{ width: 17, height: 17, marginTop: 1, accentColor: "#273FF9", flexShrink: 0, cursor: "pointer" }}
          />
          <span>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 500, color: "var(--text-strong)" }}>
              In the organization KPI library
            </span>
            <span className="piq-caption" style={{ display: "block", marginTop: 2, lineHeight: 1.5 }}>
              Other teams can adopt it at their own weight.
            </span>
          </span>
        </label>

        <div className="piq-caption" style={{ lineHeight: 1.5 }}>
          These details are shared by every team using this KPI, so a change here reaches all of them. Weights are set
          per team and are not changed here.
        </div>

        <FormError>{save.result.serverError}</FormError>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid || save.isExecuting}
            onClick={() =>
              save.execute({
                kpiId: kpi.kpiId,
                name: name.trim(),
                description: description.trim() || undefined,
                categoryId: categoryId || undefined,
                rubric: rubric.trim() || undefined,
                shareable,
              })
            }
          >
            {save.isExecuting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </FrostCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="piq-caption" style={{ color: "var(--text-secondary)", textAlign: "left" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
