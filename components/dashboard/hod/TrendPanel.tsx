import type { TrendPoint } from "./PerformanceBanner";

// Catmull-Rom -> cubic Bezier conversion so the trend line reads as a smooth
// curve (matching the design export) instead of straight segments.
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

export function TrendPanel({
  points,
  pillLabel,
  scopeLabel = "Department",
}: {
  points: TrendPoint[];
  pillLabel: string;
  scopeLabel?: "Department" | "Team";
}) {
  const w = 100;
  const h = 100;
  const chartH = 78; // leave 22 for labels
  const min = 0;
  const max = 5;
  const range = max - min;
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = points.length > 1 ? i * stepX : w / 2;
    const y = chartH - ((p.value - min) / range) * chartH;
    return { x, y, label: p.label, value: p.value };
  });
  const linePath = smoothPath(coords);
  const fillPath = coords.length
    ? `${linePath} L${coords[coords.length - 1].x},${h} L${coords[0].x},${h} Z`
    : "";
  const last = coords[coords.length - 1];

  return (
    <div
      style={{
        gridColumn: "span 4",
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 24,
        padding: 22,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>{scopeLabel} performance trend</div>
          <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>Average score across recent review cycles</div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 500,
            padding: "4px 10px",
            borderRadius: 8,
            color: "#273FF9",
            background: "rgba(58,99,250,.13)",
          }}
        >
          {pillLabel}
        </span>
      </div>
      <div style={{ position: "relative", height: 200, marginTop: 14 }}>
        {points.length > 1
          ? coords.map((c, i) => (
              <div
                key={`grid-${i}`}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 22,
                  left: `${(c.x / w) * 100}%`,
                  width: 1,
                  background: "rgba(168,175,203,.22)",
                }}
              />
            ))
          : null}
        {last ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 22,
              left: `${(last.x / w) * 100}%`,
              transform: "translateX(-50%)",
              width: 44,
              background: "linear-gradient(180deg,rgba(39,63,249,.14),rgba(39,63,249,0))",
              borderRadius: "16px 16px 0 0",
            }}
          />
        ) : null}
        {points.length > 1 ? (
          <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "calc(100% - 22px)" }}>
            <defs>
              <linearGradient id="tFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="rgba(39,63,249,.20)" />
                <stop offset="1" stopColor="rgba(39,63,249,0)" />
              </linearGradient>
            </defs>
            <path d={fillPath} fill="url(#tFill)" />
            <path d={linePath} fill="none" stroke="#273FF9" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            {coords.map((c, i) => (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={i === coords.length - 1 ? 2.6 : 1.6}
                fill={i === coords.length - 1 ? "#fff" : "#8BB0FF"}
                stroke={i === coords.length - 1 ? "#273FF9" : "none"}
                strokeWidth={i === coords.length - 1 ? 1.4 : 0}
              />
            ))}
          </svg>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100% - 22px)" }} className="piq-caption">
            Not enough closed cycles yet for a trend line.
          </div>
        )}
        {last ? (
          <div
            style={{
              position: "absolute",
              left: `${(last.x / w) * 100}%`,
              top: 10,
              transform: "translateX(-50%)",
              background: "#fff",
              boxShadow: "0 8px 20px rgba(37,41,68,.16)",
              border: "1px solid rgba(255,255,255,.9)",
              borderRadius: 11,
              padding: "6px 12px",
              fontSize: 14,
              fontWeight: 500,
              color: "#181835",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {last.value.toFixed(1)}
          </div>
        ) : null}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between" }}>
          {coords.map((c, i) => (
            <span key={i} className="piq-caption" style={{ color: i === coords.length - 1 ? "#273FF9" : "#767FA5", fontWeight: i === coords.length - 1 ? 500 : 400 }}>
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
