"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createKpi, createKpiCategory } from "@/actions/kpis";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";
import { FormError } from "@/components/ui/FormMessage";
import { distributeEvenly, rebalanceAround, weightTotal } from "@/lib/kpi-distribute";
import type { ExistingWeight, WizardCategory, WizardTeam } from "@/components/kpis/KpiWizard.types";
import {
  CategoryField,
  StepRail,
  TeamPicker,
  WeightTotalBar,
} from "@/components/kpis/KpiWizardSteps";

const NEW_KPI_ID = "__new__";

/**
 * Three-step KPI creation: what it is, what it is worth, then confirm.
 *
 * The weight step is the reason this is a wizard rather than one long form.
 * A KPI's weight only means something relative to the others on that team, so
 * it cannot be chosen sensibly until the KPI itself is defined — and adding
 * one to a team already at 100% forces a decision about what gives way.
 */
export function CreateKpiWizard({
  quarterId,
  teams,
  categories,
  existingWeights,
  defaultTeamId,
  variant = "primary",
  size,
}: {
  quarterId: string;
  teams: WizardTeam[];
  categories: WizardCategory[];
  /** Current KPI weights per team, so the wizard can rebalance around them. */
  existingWeights: ExistingWeight[];
  defaultTeamId?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg" | "header";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // step 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [rubric, setRubric] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(
    () => new Set(defaultTeamId ? [defaultTeamId] : teams[0] ? [teams[0].id] : []),
  );

  // step 2
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [rebalance, setRebalance] = useState(true);
  const [weights, setWeights] = useState<Record<string, { id: string; weightPct: number }[]>>({});

  const [localCategories, setLocalCategories] = useState(categories);

  const createCategory = useAction(createKpiCategory, {
    onSuccess: ({ data }) => {
      if (!data) return;
      setLocalCategories((current) =>
        current.some((c) => c.id === data.categoryId) ? current : [...current, { id: data.categoryId, name: data.name }],
      );
      setCategoryId(data.categoryId);
    },
  });

  const save = useAction(createKpi, {
    onSuccess: () => {
      setOpen(false);
      reset();
      router.refresh();
    },
  });

  function reset() {
    setStep(1);
    setName("");
    setDescription("");
    setCategoryId("");
    setRubric("");
    setMode("auto");
    setWeights({});
  }

  const teamIds = useMemo(() => [...selectedTeamIds], [selectedTeamIds]);

  /** Rows for one team: its existing KPIs plus the one being created. */
  function rowsFor(teamId: string) {
    const existing = existingWeights.filter((w) => w.teamId === teamId);
    return [
      { id: NEW_KPI_ID, label: name || "This KPI", isNew: true },
      ...existing.map((w) => ({ id: w.kpiTeamId, label: w.kpiName, isNew: false })),
    ];
  }

  function weightsFor(teamId: string) {
    if (weights[teamId]) return weights[teamId];
    const rows = rowsFor(teamId);
    // Auto is the default, so the step opens on a valid framework rather than
    // on an error the person has to clear before they can think.
    return distributeEvenly(rows.map((r) => r.id));
  }

  function setWeight(teamId: string, rowId: string, value: number) {
    const current = weightsFor(teamId);
    const next = rebalance
      ? rebalanceAround(current, rowId, value)
      : current.map((w) => (w.id === rowId ? { ...w, weightPct: Math.max(0, Math.min(100, value)) } : w));
    setWeights((all) => ({ ...all, [teamId]: next }));
  }

  function applyAuto() {
    const next: Record<string, { id: string; weightPct: number }[]> = {};
    for (const teamId of teamIds) next[teamId] = distributeEvenly(rowsFor(teamId).map((r) => r.id));
    setWeights(next);
  }

  const allTotalsValid = teamIds.every((id) => weightTotal(weightsFor(id)) === 100);
  const step1Valid = name.trim().length >= 2 && selectedTeamIds.size > 0;

  function submit(lifecycle: "draft" | "active") {
    save.execute({
      quarterId,
      name: name.trim(),
      description: description.trim() || undefined,
      categoryId: categoryId || undefined,
      rubric: rubric.trim() || undefined,
      cadence: "quarterly",
      lifecycle,
      teamWeights: teamIds.map((teamId) => ({
        teamId,
        weightPct: weightsFor(teamId).find((w) => w.id === NEW_KPI_ID)?.weightPct ?? 0,
      })),
      // Rebalancing moved the other KPIs too; those edits have to be saved or
      // the team ends up over 100% the moment this one lands.
      weightEdits: teamIds.flatMap((teamId) =>
        weightsFor(teamId)
          .filter((w) => w.id !== NEW_KPI_ID)
          .map((w) => ({ kpiTeamId: w.id, weightPct: w.weightPct })),
      ),
    });
  }

  if (!open) {
    return (
      <Button variant={variant} size={size} icon="ant-design:plus-outlined" onClick={() => setOpen(true)}>
        Create KPI
      </Button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(24,24,53,.55)",
        WebkitBackdropFilter: "blur(3px)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 50,
        textAlign: "left",
      }}
      onClick={() => setOpen(false)}
    >
      <FrostCard
        tone="modal"
        padding={26}
        style={{ width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="piq-caption" style={{ textTransform: "uppercase", letterSpacing: ".04em" }}>
              New KPI
            </div>
            <div className="piq-h3" style={{ marginTop: 2 }}>
              Create KPI
            </div>
          </div>
          <IconButton icon="ant-design:close-outlined" aria-label="Close" onClick={() => setOpen(false)} />
        </div>

        <StepRail step={step} />

        {step === 1 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="KPI name *">
              <input className="piq-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Communication" />
            </Field>

            <Field label="Short description">
              <textarea
                className="piq-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this KPI measure and how should reviewers score it?"
                rows={2}
                style={{ height: "auto", padding: "12px 14px", resize: "vertical", lineHeight: 1.5 }}
              />
            </Field>

            <Field label="Category (optional)">
              <CategoryField
                categories={localCategories}
                value={categoryId}
                onChange={setCategoryId}
                onCreate={(n) => createCategory.execute({ name: n })}
                creating={createCategory.isExecuting}
              />
            </Field>

            <Field label="Rating guidance (optional)">
              <textarea
                className="piq-input"
                value={rubric}
                onChange={(e) => setRubric(e.target.value)}
                placeholder="What does a 1 look like, and what does a 5 look like? Reviewers see this while scoring."
                rows={3}
                style={{ height: "auto", padding: "12px 14px", resize: "vertical", lineHeight: 1.5 }}
              />
            </Field>

            <Field label="Teams this applies to *">
              <TeamPicker
                teams={teams}
                selected={selectedTeamIds}
                onToggle={(id) =>
                  setSelectedTeamIds((current) => {
                    const next = new Set(current);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    // Weights are per team, so a changed selection invalidates
                    // whatever was calculated for the old one.
                    setWeights({});
                    return next;
                  })
                }
              />
            </Field>
          </div>
        ) : null}

        {step === 2 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text-strong)" }}>Weight configuration</div>
              <div className="piq-caption" style={{ marginTop: 3 }}>
                Choose how weight is assigned across each team&rsquo;s KPIs this quarter.
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMode("auto");
                applyAuto();
              }}
              style={modeCardStyle(mode === "auto")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-strong)" }}>Auto weight distribution</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: ".04em",
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: "rgba(39,63,249,.12)",
                    color: "#1C10C9",
                  }}
                >
                  RECOMMENDED
                </span>
              </div>
              <div className="piq-caption" style={{ marginTop: 4 }}>
                Split 100% equally across every KPI on the team, including this one.
              </div>
            </button>

            <button type="button" onClick={() => setMode("manual")} style={modeCardStyle(mode === "manual")}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-strong)" }}>Manual weight distribution</span>
              <div className="piq-caption" style={{ marginTop: 4 }}>
                Set each weight yourself. Keep rebalancing on and the others adjust to hold the total at 100%.
              </div>
            </button>

            {mode === "manual" ? (
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={rebalance}
                  onChange={(e) => setRebalance(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-strong)" }}>
                    Automatically rebalance the other KPIs
                  </span>
                  <span className="piq-caption" style={{ display: "block", marginTop: 2 }}>
                    Changing one weight adjusts the rest proportionally so the total stays at 100%.
                  </span>
                </span>
              </label>
            ) : null}

            {teamIds.map((teamId) => {
              const team = teams.find((t) => t.id === teamId);
              const rows = rowsFor(teamId);
              const current = weightsFor(teamId);
              return (
                <div key={teamId} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
                    {team?.name ?? "Team"}
                  </div>
                  {rows.map((row) => {
                    const w = current.find((c) => c.id === row.id)?.weightPct ?? 0;
                    return (
                      <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ flex: 1, fontSize: 13, color: "var(--text-body)", minWidth: 0 }}>
                          {row.label}
                          {row.isNew ? (
                            <span
                              style={{
                                marginLeft: 7,
                                fontSize: 10,
                                fontWeight: 600,
                                padding: "2px 6px",
                                borderRadius: 999,
                                background: "rgba(39,63,249,.12)",
                                color: "#1C10C9",
                              }}
                            >
                              NEW
                            </span>
                          ) : null}
                        </span>
                        <input
                          className="piq-input"
                          type="number"
                          min={0}
                          max={100}
                          value={w}
                          disabled={mode === "auto"}
                          onChange={(e) => setWeight(teamId, row.id, Number(e.target.value))}
                          style={{ width: 84, height: 38, textAlign: "right", opacity: mode === "auto" ? 0.6 : 1 }}
                        />
                        <span className="piq-caption" style={{ width: 14 }}>
                          %
                        </span>
                      </div>
                    );
                  })}
                  <WeightTotalBar total={weightTotal(current)} />
                </div>
              );
            })}
          </div>
        ) : null}

        {step === 3 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text-strong)" }}>Review &amp; publish</div>
              <div className="piq-caption" style={{ marginTop: 3 }}>
                Confirm the details before saving. A draft is not scored on until you publish it.
              </div>
            </div>

            <dl style={{ display: "flex", flexDirection: "column", gap: 10, margin: 0 }}>
              <SummaryRow label="KPI name" value={name} />
              {description ? <SummaryRow label="Description" value={description} /> : null}
              <SummaryRow
                label="Category"
                value={localCategories.find((c) => c.id === categoryId)?.name ?? "None"}
              />
              {rubric ? <SummaryRow label="Rating guidance" value={rubric} /> : null}
              {teamIds.map((teamId) => {
                const team = teams.find((t) => t.id === teamId);
                const mine = weightsFor(teamId).find((w) => w.id === NEW_KPI_ID)?.weightPct ?? 0;
                return (
                  <SummaryRow
                    key={teamId}
                    label={team?.name ?? "Team"}
                    value={`${mine}% · framework ${weightTotal(weightsFor(teamId))}% / 100% (${mode})`}
                  />
                );
              })}
            </dl>
          </div>
        ) : null}

        <FormError>
          {save.result.serverError ??
            createCategory.result.serverError ??
            (step === 2 && !allTotalsValid ? "Every team needs to total exactly 100% before you continue." : undefined)}
        </FormError>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {step > 1 ? (
            <Button variant="secondary" onClick={() => setStep((s) => (s === 3 ? 2 : 1))}>
              Back
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>

          {step === 1 ? (
            <Button
              disabled={!step1Valid}
              onClick={() => {
                applyAuto();
                setStep(2);
              }}
            >
              Continue
            </Button>
          ) : step === 2 ? (
            <Button disabled={!allTotalsValid} onClick={() => setStep(3)}>
              Continue
            </Button>
          ) : (
            <>
              <Button variant="secondary" disabled={save.isExecuting} onClick={() => submit("draft")}>
                {save.isExecuting ? "Saving…" : "Save draft"}
              </Button>
              <Button disabled={save.isExecuting} onClick={() => submit("active")}>
                {save.isExecuting ? "Publishing…" : "Publish KPI"}
              </Button>
            </>
          )}
        </div>
      </FrostCard>
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      <span className="piq-caption" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <dt className="piq-caption" style={{ width: 130, flexShrink: 0, textTransform: "uppercase", letterSpacing: ".04em" }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: 13.5, color: "var(--text-strong)", lineHeight: 1.5 }}>{value}</dd>
    </div>
  );
}

function modeCardStyle(active: boolean): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "14px 16px",
    borderRadius: 14,
    cursor: "pointer",
    background: active ? "rgba(39,63,249,.08)" : "rgba(255,255,255,.55)",
    border: `1px solid ${active ? "rgba(58,99,250,.45)" : "rgba(255,255,255,.7)"}`,
  };
}
