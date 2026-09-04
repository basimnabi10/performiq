export interface ScoreBucket {
  label: string;
  color: string;
  count: number;
  pct: number;
  names: string;
}

export function ScoreDistributionPanel({
  buckets,
  headcount,
  unscoredNote,
}: {
  buckets: ScoreBucket[];
  headcount: number;
  unscoredNote: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 20,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Score distribution</div>
      <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>How {headcount} scored people land on the 1–5 scale</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
        {buckets.map((b) => (
          <div key={b.label}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: b.color }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>{b.label}</span>
              </div>
              <span style={{ fontSize: 12, color: "#596392", fontVariantNumeric: "tabular-nums" }}>
                {b.count} {b.count === 1 ? "person" : "people"}
              </span>
            </div>
            <div style={{ height: 9, borderRadius: 5, background: "rgba(168,175,203,.25)", overflow: "hidden" }}>
              <div style={{ width: `${b.pct}%`, height: "100%", borderRadius: 5, background: b.color }} />
            </div>
            <div style={{ fontSize: 11, color: "#767FA5", marginTop: 4 }}>{b.names}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 14,
          padding: "10px 12px",
          background: "rgba(255,255,255,.45)",
          border: "1px solid rgba(168,175,203,.25)",
          borderRadius: 12,
        }}
      >
        <iconify-icon icon="ant-design:info-circle-outlined" width="14" style={{ color: "#767FA5", flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: "#767FA5" }}>{unscoredNote}</span>
      </div>
    </div>
  );
}
