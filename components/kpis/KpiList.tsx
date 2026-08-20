import { Tag } from "@/components/ui/Tag";

export interface KpiListRow {
  kpiTeamId: string;
  kpiId: string;
  name: string;
  description: string | null;
  targetValue: string;
  unit: string | null;
  weightPct: number;
  status: "on" | "below" | "new";
}

const STATUS_LABEL: Record<KpiListRow["status"], string> = {
  on: "On target",
  below: "Below target",
  new: "Not scored yet",
};

const STATUS_TONE: Record<KpiListRow["status"], "onTrack" | "atRisk" | "neutral"> = {
  on: "onTrack",
  below: "atRisk",
  new: "neutral",
};

export function KpiList({ rows }: { rows: KpiListRow[] }) {
  if (rows.length === 0) {
    return <div className="piq-caption">No KPIs yet for this team&rsquo;s active cycle.</div>;
  }

  const totalWeight = rows.reduce((s, r) => s + r.weightPct, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="piq-caption">Total weight allocated: {totalWeight}% / 100%</div>
      {rows.map((r) => (
        <div
          key={r.kpiTeamId}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 18px",
            borderRadius: 16,
            background: "rgba(255,255,255,.35)",
            border: "1px solid rgba(255,255,255,.5)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>{r.name}</div>
            {r.description ? <div className="piq-caption">{r.description}</div> : null}
          </div>
          <div className="piq-caption" style={{ width: 110 }}>
            Target {r.targetValue} {r.unit ?? ""}
          </div>
          <div className="piq-caption" style={{ width: 70 }}>
            {r.weightPct}% weight
          </div>
          <Tag tone={STATUS_TONE[r.status]} dot>
            {STATUS_LABEL[r.status]}
          </Tag>
        </div>
      ))}
    </div>
  );
}
