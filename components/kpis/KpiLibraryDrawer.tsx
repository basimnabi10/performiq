"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { adoptKpi } from "@/actions/kpis";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormMessage";

export interface LibraryKpi {
  kpiId: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  target: string;
  unit: string | null;
  /** Teams already using it, so you can see what it is worth elsewhere. */
  usedBy: { teamName: string; weightPct: number }[];
  alreadyOnThisTeam: boolean;
}

/**
 * The organization's shared KPI library.
 *
 * Adding from here links the existing KPI to your team rather than copying
 * it, so the same "Communication" means the same thing everywhere and only
 * the weight is yours. Each entry shows who else uses it and at what weight,
 * which is usually what you want to know before adopting one.
 */
export function KpiLibraryDrawer({
  kpis,
  teamId,
  teamName,
  remainingWeight,
}: {
  kpis: LibraryKpi[];
  teamId: string;
  teamName: string;
  /** How much of this team's 100% is still unassigned. */
  remainingWeight: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [weights, setWeights] = useState<Record<string, number>>({});

  const adopt = useAction(adoptKpi, { onSuccess: () => router.refresh() });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return kpis;
    return kpis.filter(
      (k) =>
        k.name.toLowerCase().includes(q) ||
        (k.categoryName ?? "").toLowerCase().includes(q) ||
        (k.description ?? "").toLowerCase().includes(q),
    );
  }, [kpis, query]);

  if (!open) {
    return (
      <Button variant="secondary" icon="ant-design:appstore-outlined" onClick={() => setOpen(true)}>
        KPI library
      </Button>
    );
  }

  return (
    <div
      onClick={() => setOpen(false)}
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
        aria-label="Organization KPI library"
        style={{
          width: "min(520px, 100%)",
          height: "100%",
          overflowY: "auto",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "rgba(255,255,255,.94)",
          WebkitBackdropFilter: "blur(40px) saturate(150%)",
          backdropFilter: "blur(40px) saturate(150%)",
          borderLeft: "1px solid rgba(255,255,255,.8)",
          boxShadow: "-20px 0 50px rgba(24,24,53,.22)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="piq-h3">KPI library</div>
            <div className="piq-caption" style={{ marginTop: 3, lineHeight: 1.55 }}>
              KPIs other teams have shared. Adding one links it to <strong>{teamName}</strong> at your own weight — the
              KPI itself stays shared, so its wording and target match everywhere.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            style={{ border: "none", background: "transparent", color: "var(--text-tertiary)", cursor: "pointer", lineHeight: 0 }}
          >
            <iconify-icon icon="ant-design:close-outlined" width={18} />
          </button>
        </div>

        <div
          style={{
            padding: "10px 13px",
            borderRadius: 12,
            background: remainingWeight > 0 ? "rgba(39,63,249,.08)" : "rgba(250,173,20,.14)",
            fontSize: 12.5,
            color: "var(--text-body)",
          }}
        >
          {remainingWeight > 0
            ? `${remainingWeight}% of ${teamName}'s weight is still unassigned.`
            : `${teamName} is already at 100%. Lower an existing weight before adding another KPI.`}
        </div>

        <input
          className="piq-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the library…"
        />

        <FormError>{adopt.result.serverError}</FormError>

        {filtered.length === 0 ? (
          <div className="piq-caption" style={{ lineHeight: 1.6 }}>
            {kpis.length === 0
              ? "Nothing shared yet. Open a KPI and turn on sharing to put it here."
              : "No KPI matches that search."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((k) => {
              const weight = weights[k.kpiId] ?? Math.min(remainingWeight, 10);
              return (
                <div
                  key={k.kpiId}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: "rgba(255,255,255,.6)",
                    border: "1px solid rgba(255,255,255,.75)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 9,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-strong)" }}>{k.name}</span>
                    {k.categoryName ? (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(39,63,249,.1)", color: "#1C10C9" }}>
                        {k.categoryName}
                      </span>
                    ) : null}
                    <span className="piq-caption" style={{ marginLeft: "auto" }}>
                      Target {k.target}
                      {k.unit ? ` ${k.unit}` : ""}
                    </span>
                  </div>

                  {k.description ? (
                    <div className="piq-caption" style={{ lineHeight: 1.5 }}>
                      {k.description}
                    </div>
                  ) : null}

                  <div className="piq-caption">
                    {k.usedBy.length === 0
                      ? "Not used by any team yet"
                      : `Used by ${k.usedBy.map((u) => `${u.teamName} (${u.weightPct}%)`).join(", ")}`}
                  </div>

                  {k.alreadyOnThisTeam ? (
                    <div className="piq-caption" style={{ color: "#1B7A48" }}>
                      Already on {teamName}
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        className="piq-input"
                        type="number"
                        min={0}
                        max={100}
                        value={weight}
                        onChange={(e) => setWeights((w) => ({ ...w, [k.kpiId]: Number(e.target.value) }))}
                        style={{ width: 78, height: 38, textAlign: "right" }}
                      />
                      <span className="piq-caption">% weight</span>
                      <Button
                        size="sm"
                        style={{ marginLeft: "auto" }}
                        disabled={adopt.isExecuting || weight > remainingWeight}
                        onClick={() => adopt.execute({ kpiId: k.kpiId, teamId, weightPct: weight })}
                      >
                        {adopt.isExecuting ? "Adding…" : "Add to team"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
}
