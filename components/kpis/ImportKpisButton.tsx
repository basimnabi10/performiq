"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { importKpis } from "@/actions/kpis";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { IconButton } from "@/components/ui/IconButton";
import { FormError } from "@/components/ui/FormMessage";
import { parseCsvObjects } from "@/lib/csv";

const TEMPLATE = [
  "name,description,category,target,unit,weight,metric,direction,rubric",
  'Communication,"Clarity and timeliness of updates",Performance,≥ 4.5,rating,20,rating,higher_is_better,"1 = rarely responds; 5 = proactive and clear"',
  "On-time delivery,Ships committed work when promised,Performance,≥ 90,%,15,percentage,higher_is_better,",
].join("\r\n");

/** Header aliases, so a sheet written by a human still imports. */
function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v) return v;
  }
  return "";
}

/**
 * Bulk KPI import from a spreadsheet.
 *
 * Parsed in the browser so problems are shown before anything is sent, and
 * everything lands as a DRAFT: a sheet is the easiest way to get twenty KPIs
 * slightly wrong, and a draft can be fixed before anyone is scored on it.
 */
export function ImportKpisButton({
  quarterId,
  teamId,
  teamName,
}: {
  quarterId: string;
  teamId: string;
  teamName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ReturnType<typeof toRows>>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const run = useAction(importKpis, {
    onSuccess: () => {
      setOpen(false);
      setRows([]);
      setFileName(null);
      router.refresh();
    },
  });

  function toRows(objects: Record<string, string>[]) {
    return objects.map((o) => ({
      name: pick(o, "name", "kpi name", "kpi"),
      description: pick(o, "description", "short description", "detail") || undefined,
      categoryName: pick(o, "category", "kpi category") || undefined,
      rubric: pick(o, "rubric", "rating guidance", "guidance") || undefined,
      targetValue: pick(o, "target", "target value") || "",
      unit: pick(o, "unit") || undefined,
      weightPct: Number(pick(o, "weight", "weight %", "weightpct") || 0),
      metricType: (pick(o, "metric", "metric type") || "rating") as
        | "number"
        | "percentage"
        | "rating"
        | "currency"
        | "days",
      direction: (pick(o, "direction") || "higher_is_better") as "higher_is_better" | "lower_is_better",
    }));
  }

  async function onFile(file: File) {
    setFileError(null);
    setFileName(file.name);
    const text = await file.text();
    const parsed = toRows(parseCsvObjects(text));

    const bad = parsed.filter((r) => !r.name || !r.targetValue || !Number.isFinite(r.weightPct));
    if (parsed.length === 0) {
      setFileError("No rows found. The first line must be a header row.");
      setRows([]);
      return;
    }
    if (bad.length > 0) {
      setFileError(
        `${bad.length} row${bad.length === 1 ? "" : "s"} missing a name, target or weight — fix the file and try again.`,
      );
      setRows([]);
      return;
    }
    setRows(parsed);
  }

  function downloadTemplate() {
    const blob = new Blob(["﻿" + TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "performiq-kpi-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!open) {
    return (
      <Button variant="secondary" icon="ant-design:upload-outlined" onClick={() => setOpen(true)}>
        Import CSV
      </Button>
    );
  }

  const totalWeight = rows.reduce((sum, r) => sum + r.weightPct, 0);

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 55,
        background: "rgba(24,24,53,.55)",
        WebkitBackdropFilter: "blur(3px)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <FrostCard
        tone="modal"
        padding={26}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 540, maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="piq-h3">Import KPIs</div>
            <div className="piq-caption" style={{ marginTop: 3, lineHeight: 1.55 }}>
              Upload a CSV for <strong>{teamName}</strong>. Everything imports as a draft, so you can check it before
              anyone is scored on it.
            </div>
          </div>
          <IconButton icon="ant-design:close-outlined" aria-label="Close" onClick={() => setOpen(false)} />
        </div>

        <button type="button" onClick={downloadTemplate} className="piq-authlink" style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          Download a template
        </button>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
          className="piq-input"
          style={{ height: "auto", padding: 12 }}
        />

        {fileError ? <FormError>{fileError}</FormError> : null}
        <FormError>{run.result.serverError}</FormError>

        {rows.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="piq-caption">
              {fileName} · {rows.length} KPI{rows.length === 1 ? "" : "s"} · {totalWeight}% total weight
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {rows.map((r, i) => (
                <div
                  key={`${r.name}-${i}`}
                  style={{ display: "flex", gap: 10, padding: "9px 11px", borderRadius: 11, background: "rgba(255,255,255,.6)" }}
                >
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text-strong)" }}>{r.name}</span>
                  <span className="piq-caption">{r.categoryName ?? "—"}</span>
                  <span className="piq-caption">{r.targetValue}</span>
                  <span className="piq-caption" style={{ width: 34, textAlign: "right" }}>
                    {r.weightPct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={rows.length === 0 || run.isExecuting}
            onClick={() => run.execute({ quarterId, teamId, rows })}
          >
            {run.isExecuting ? "Importing…" : `Import ${rows.length || ""} as drafts`}
          </Button>
        </div>
      </FrostCard>
    </div>
  );
}
