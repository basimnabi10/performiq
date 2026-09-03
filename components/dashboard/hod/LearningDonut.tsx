import Link from "next/link";

export function LearningDonut({
  assigned,
  completed,
  inProgress,
  overdue,
}: {
  assigned: number;
  completed: number;
  inProgress: number;
  overdue: number;
}) {
  const pct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
  const pctDisplay = assigned > 0 ? `${pct}%` : "—";

  return (
    <div
      style={{
        gridColumn: "span 2",
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 28,
        padding: 28,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 22, fontWeight: 500, color: "#181835" }}>Learning overview</span>
        <Link href="/learning" style={{ fontSize: 14, fontWeight: 500, color: "#273FF9" }}>
          Studio
        </Link>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 22 }}>
        <div
          style={{
            width: 144,
            height: 144,
            borderRadius: "50%",
            background: `conic-gradient(#273FF9 0 ${pct}%, rgba(168,175,203,.35) ${pct}% 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 106,
              height: 106,
              borderRadius: "50%",
              background: "rgba(255,255,255,.9)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 30, fontWeight: 500, color: "#181835" }}>{pctDisplay}</span>
            <span style={{ fontSize: 12, color: "#767FA5" }}>complete</span>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 15 }}>
          {[
            { icon: "ant-design:book-outlined", label: "Assigned", value: assigned, color: "#767FA5" },
            { icon: "ant-design:check-circle-outlined", label: "Completed", value: completed, color: "#273FF9" },
            { icon: "ant-design:sync-outlined", label: "In progress", value: inProgress, color: "#767FA5" },
            { icon: "ant-design:clock-circle-outlined", label: "Overdue", value: overdue, color: "#767FA5" },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, color: "#596392" }}>
                <iconify-icon icon={row.icon} width="16" style={{ color: row.color, verticalAlign: "-3px" }} /> {row.label}
              </span>
              <span style={{ fontSize: 16, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
