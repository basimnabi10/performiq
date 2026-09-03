export interface MemberTrendPoint {
  label: string;
  value: number;
}

function smoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length < 2) return "";
  if (coords.length === 2) return `M${coords[0].x},${coords[0].y} L${coords[1].x},${coords[1].y}`;
  let d = `M${coords[0].x},${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function MemberTrendChart({ points }: { points: MemberTrendPoint[] }) {
  const w = 100;
  const h = 100;
  const chartH = 80;
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: points.length > 1 ? i * stepX : w / 2,
    y: chartH - ((p.value - 2.5) / 2.5) * chartH,
    label: p.label,
    value: p.value,
  }));
  const linePath = smoothPath(coords);
  const areaPath = coords.length ? `${linePath} L${coords[coords.length - 1].x},100 L${coords[0].x},100 Z` : "";
  const current = points[points.length - 1] ?? null;
  const first = points[0] ?? null;
  const delta = current && first ? Math.round((current.value - first.value) * 10) / 10 : null;
  const up = delta == null || delta >= 0;

  return (
    <div
      style={{
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 22,
        padding: 22,
      }}
    >
      <div>
        <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Performance analytics</div>
        <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>
          {points.length} cycle{points.length === 1 ? "" : "s"} · KPI-weighted score
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 14 }}>
        <span style={{ fontSize: 30, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>
          {current ? current.value.toFixed(1) : "—"}
          <span style={{ fontSize: 15, color: "#A8AFCB" }}>/5</span>
        </span>
        {delta != null ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: 12,
              fontWeight: 500,
              padding: "4px 10px",
              borderRadius: 8,
              color: up ? "#273FF9" : "#596392",
              background: up ? "rgba(58,99,250,.13)" : "rgba(89,99,146,.14)",
            }}
          >
            {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)} over period
          </span>
        ) : null}
      </div>
      <div style={{ position: "relative", height: 190, marginTop: 12 }}>
        {points.length > 1 ? (
          <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "calc(100% - 20px)" }}>
            <defs>
              <linearGradient id="mpFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="rgba(39,63,249,.22)" />
                <stop offset="1" stopColor="rgba(39,63,249,0)" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#mpFill)" />
            <path d={linePath} fill="none" stroke="#273FF9" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100% - 20px)" }} className="piq-caption">
            Not enough closed cycles yet for a trend line.
          </div>
        )}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "space-between" }}>
          {coords.map((c, i) => (
            <span key={i} style={{ fontSize: 11, color: "#767FA5" }}>
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
