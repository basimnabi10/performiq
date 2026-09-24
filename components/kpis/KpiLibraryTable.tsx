"use client";

import { useMemo, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { setKpiLifecycle } from "@/actions/kpis";
import { IconButton } from "@/components/ui/IconButton";
import { EditKpiModal, type EditableKpi } from "@/components/kpis/EditKpiModal";
import { KpiDetailDrawer, type KpiDetail } from "@/components/kpis/KpiDetailDrawer";
import type { WizardCategory } from "@/components/kpis/KpiWizard.types";

export interface KpiLibraryRow {
  kpiId: string;
  /** Null when several teams are being shown at once: a KPI has one KpiTeam
   * row per team, so there is no single one to act on. */
  kpiTeamId: string | null;
  name: string;
  description: string | null;
  rubric: string | null;
  categoryId: string | null;
  categoryName: string | null;
  lifecycle: "draft" | "active" | "archived";
  shareable: boolean;
  /** The weight on the selected team, or null when showing every team. */
  weightPct: number | null;
  /** Set only in the all-teams view: how this KPI is weighted across teams. */
  spread: { teamCount: number; min: number; max: number } | null;
  updatedLabel: string;
}

const STATUS: Record<KpiLibraryRow["lifecycle"], { label: string; dot: string; color: string; bg: string }> = {
  draft: { label: "Draft", dot: "#D48806", color: "#8A5D00", bg: "rgba(250,173,20,.16)" },
  active: { label: "Active", dot: "#2FBF71", color: "#1B7A48", bg: "rgba(47,191,113,.16)" },
  archived: { label: "Archived", dot: "#767FA5", color: "#454D7A", bg: "rgba(89,99,146,.14)" },
};

export function KpiLibraryTable({
  rows,
  details,
  categories,
  canManage,
}: {
  rows: KpiLibraryRow[];
  /** Everything the side drawer shows, keyed by KPI id. */
  details: Record<string, KpiDetail>;
  categories: WizardCategory[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editing, setEditing] = useState<EditableKpi | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [viewing, setViewing] = useState<KpiDetail | null>(null);

  const lifecycle = useAction(setKpiLifecycle, { onSuccess: () => setMenuFor(null) });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (categoryId && r.categoryId !== categoryId) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q);
    });
  }, [rows, query, categoryId]);

  return (
    <div
      style={{
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 24,
        padding: 22,
      }}
    >
      <div className="piq-h3">KPI library</div>
      <div className="piq-caption" style={{ marginTop: 3 }}>
        Every KPI scored on this quarter&rsquo;s review forms.
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 0 }}>
          <iconify-icon
            icon="ant-design:search-outlined"
            width="15"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }}
          />
          <input
            className="piq-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search KPIs…"
            style={{ paddingLeft: 38, width: "100%" }}
          />
        </div>
        <select
          className="piq-select"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={{ flex: "0 1 200px" }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="piq-caption" style={{ marginTop: 18 }}>
          No KPIs yet for this quarter.
        </div>
      ) : visible.length === 0 ? (
        <div className="piq-caption" style={{ marginTop: 18 }}>
          Nothing matches that search.
        </div>
      ) : (
        <div style={{ marginTop: 16, overflowX: "auto" }}>
          <div style={{ minWidth: 860 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 2fr 1fr 1.1fr .9fr .9fr 108px",
                gap: 14,
                padding: "0 14px 10px",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-secondary)",
                letterSpacing: ".05em",
                textTransform: "uppercase",
              }}
            >
              <div>KPI name</div>
              <div>Description</div>
              <div>Category</div>
              <div>Weight</div>
              <div>Status</div>
              <div>Last updated</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visible.map((r) => {
                const status = STATUS[r.lifecycle];
                return (
                  <div
                    key={r.kpiId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 2fr 1fr 1.1fr .9fr .9fr 108px",
                      gap: 14,
                      alignItems: "center",
                      padding: "13px 14px",
                      borderRadius: 16,
                      background: "rgba(255,255,255,.5)",
                      opacity: r.lifecycle === "archived" ? 0.7 : 1,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-strong)" }}>{r.name}</div>

                    <div
                      className="piq-caption"
                      style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={r.description ?? undefined}
                    >
                      {r.description || "—"}
                    </div>

                    <div>
                      {r.categoryName ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 9px",
                            borderRadius: "var(--radius-pill)",
                            background: "rgba(39,63,249,.10)",
                            color: "#1C10C9",
                            fontSize: 11.5,
                            fontWeight: 500,
                          }}
                        >
                          <iconify-icon icon="ant-design:tag-outlined" width="11" />
                          {r.categoryName}
                        </span>
                      ) : (
                        <span className="piq-caption">—</span>
                      )}
                    </div>

                    <WeightCell weightPct={r.weightPct} spread={r.spread} />

                    <div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "3px 10px",
                          borderRadius: "var(--radius-pill)",
                          background: status.bg,
                          color: status.color,
                          fontSize: 11.5,
                          fontWeight: 500,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: status.dot }} />
                        {status.label}
                      </span>
                    </div>

                    <div className="piq-caption">{r.updatedLabel}</div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, position: "relative" }}>
                      <IconButton
                        icon="ant-design:eye-outlined"
                        variant="chrome"
                        size={30}
                        label={`View ${r.name}`}
                        onClick={() => setViewing(details[r.kpiId] ?? null)}
                      />
                      {canManage ? (
                        <>
                          <IconButton
                            icon="ant-design:edit-outlined"
                            variant="chrome"
                            size={30}
                            label={`Edit ${r.name}`}
                            onClick={() =>
                              setEditing({
                                kpiId: r.kpiId,
                                name: r.name,
                                description: r.description,
                                categoryId: r.categoryId,
                                rubric: r.rubric,
                                shareable: r.shareable,
                              })
                            }
                          />
                          <IconButton
                            icon="ant-design:more-outlined"
                            variant="chrome"
                            size={30}
                            label={`More actions for ${r.name}`}
                            onClick={() => setMenuFor(menuFor === r.kpiId ? null : r.kpiId)}
                          />
                        </>
                      ) : null}

                      {menuFor === r.kpiId ? (
                        <>
                          <div
                            onClick={() => setMenuFor(null)}
                            style={{ position: "fixed", inset: 0, zIndex: 40 }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              top: 36,
                              right: 0,
                              zIndex: 41,
                              minWidth: 210,
                              padding: 6,
                              borderRadius: 14,
                              background: "rgba(255,255,255,.96)",
                              border: "1px solid rgba(168,175,203,.4)",
                              boxShadow: "0 16px 36px rgba(24,24,53,.18)",
                            }}
                          >
                            {r.lifecycle !== "active" ? (
                              <button
                                className="piq-dropdown-item"
                                disabled={lifecycle.isExecuting}
                                onClick={() => lifecycle.execute({ kpiId: r.kpiId, lifecycle: "active" })}
                              >
                                {r.lifecycle === "archived" ? "Restore to active" : "Publish"}
                              </button>
                            ) : null}
                            {r.lifecycle === "active" ? (
                              <button
                                className="piq-dropdown-item"
                                disabled={lifecycle.isExecuting}
                                onClick={() => lifecycle.execute({ kpiId: r.kpiId, lifecycle: "draft" })}
                              >
                                Send back to draft
                              </button>
                            ) : null}
                            {r.lifecycle !== "archived" ? (
                              <button
                                className="piq-dropdown-item"
                                disabled={lifecycle.isExecuting}
                                onClick={() => lifecycle.execute({ kpiId: r.kpiId, lifecycle: "archived" })}
                                style={{ color: "#B42318" }}
                              >
                                Archive
                              </button>
                            ) : null}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {lifecycle.result.serverError ? (
        <div className="piq-caption" style={{ marginTop: 12, color: "#B42318" }}>
          {lifecycle.result.serverError}
        </div>
      ) : null}

      <div className="piq-caption" style={{ marginTop: 14, lineHeight: 1.5 }}>
        Archiving keeps the scores already given against a KPI but leaves it out of new review forms, and frees its
        weight for something else.
      </div>

      <KpiDetailDrawer kpi={viewing} onClose={() => setViewing(null)} canManage={canManage} />

      {editing ? <EditKpiModal kpi={editing} categories={categories} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

/**
 * One team shows that team's weight as a bar. Every team at once shows the
 * spread instead — a KPI carries a different weight on each team, so a single
 * bar would be picking one of them arbitrarily.
 */
function WeightCell({ weightPct, spread }: { weightPct: number | null; spread: KpiLibraryRow["spread"] }) {
  if (weightPct != null) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(168,175,203,.30)", overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.min(100, weightPct)}%`,
              height: "100%",
              borderRadius: 3,
              background: "linear-gradient(135deg,#3A63FA,#273FF9)",
            }}
          />
        </div>
        <span style={{ fontSize: 12.5, color: "var(--text-body)", fontVariantNumeric: "tabular-nums" }}>
          {weightPct}%
        </span>
      </div>
    );
  }

  if (!spread) return <span className="piq-caption">—</span>;

  return (
    <span className="piq-caption" style={{ fontVariantNumeric: "tabular-nums" }}>
      {spread.teamCount} team{spread.teamCount === 1 ? "" : "s"} ·{" "}
      {spread.min === spread.max ? `${spread.max}%` : `${spread.min}–${spread.max}%`}
    </span>
  );
}
