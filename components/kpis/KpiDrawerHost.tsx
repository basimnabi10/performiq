"use client";

import { useState } from "react";
import { KpiDetailDrawer, type KpiDetail } from "@/components/kpis/KpiDetailDrawer";

/**
 * Opens the KPI drawer when a row inside it is clicked.
 *
 * Uses one delegated listener and a lookup rather than making every row its
 * own client component: the rows are server-rendered and there is no reason
 * to ship the whole list to the browser just to know which one was clicked.
 */
export function KpiDrawerHost({
  details,
  children,
}: {
  /** Keyed by the same id the rows carry in data-kpi-id. */
  details: Record<string, KpiDetail>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState<KpiDetail | null>(null);

  return (
    <>
      <div
        onClick={(e) => {
          const row = (e.target as HTMLElement).closest<HTMLElement>("[data-kpi-id]");
          if (!row) return;
          // Let links and buttons inside a row do their own job.
          if ((e.target as HTMLElement).closest("a,button,input,select,textarea")) return;
          const detail = details[row.dataset.kpiId ?? ""];
          if (detail) setOpen(detail);
        }}
      >
        {children}
      </div>
      <KpiDetailDrawer kpi={open} onClose={() => setOpen(null)} />
    </>
  );
}
