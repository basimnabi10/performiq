export interface TrendPoint {
  label: string;
  value: number;
}

function pointsToPath(points: TrendPoint[], w: number, h: number, min: number, max: number) {
  if (points.length === 0) return { line: "", fill: "" };
  const range = max - min || 1;
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = points.length > 1 ? i * stepX : w;
    const y = h - ((p.value - min) / range) * h;
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const fill = `${line} L${coords[coords.length - 1][0]},${h} L${coords[0][0]},${h} Z`;
  return { line, fill };
}

export function PerformanceBanner({
  sentence,
  sub,
  score,
  deltaLabel,
  deltaUp,
  trend,
}: {
  sentence: string;
  sub: string;
  score: string;
  deltaLabel: string;
  deltaUp: boolean;
  trend: TrendPoint[];
}) {
  const { line, fill } = pointsToPath(trend, 150, 78, 0, 5);

  return (
    <div
      style={{
        gridColumn: "span 6",
        minWidth: 0,
        background: "linear-gradient(150deg,#2C3158,#181835)",
        border: "1px solid rgba(255,255,255,.1)",
        boxShadow: "0 8px 24px rgba(24,24,53,.2)",
        borderRadius: 24,
        padding: "26px 30px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 340,
          height: 340,
          right: -70,
          top: -120,
          borderRadius: "50%",
          background: "radial-gradient(circle,rgba(58,99,250,.4),transparent 70%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 30,
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: 620, minWidth: 0, flex: "1 1 320px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12,
              fontWeight: 500,
              color: "#8BB0FF",
              background: "rgba(136,176,255,.14)",
              border: "1px solid rgba(136,176,255,.2)",
              padding: "6px 12px",
              borderRadius: 10,
            }}
          >
            <iconify-icon icon="ant-design:rise-outlined" width="14" />
            Performance vs last cycle
          </span>
          <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-.02em", color: "#fff", marginTop: 16, lineHeight: 1.25 }}>
            {sentence}
          </div>
          <div style={{ fontSize: 14, color: "#A8AFCB", marginTop: 10, lineHeight: 1.55 }}>{sub}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap", minWidth: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#767FA5" }}>Overall score</div>
            <div style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-.02em", color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1.05 }}>
              {score}
              <span style={{ fontSize: 20, color: "#767FA5" }}>/5</span>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 500,
                padding: "4px 10px",
                borderRadius: 8,
                marginTop: 4,
                color: deltaUp ? "#8BB0FF" : "#A8AFCB",
                background: "rgba(136,176,255,.14)",
              }}
            >
              {deltaUp ? "▲" : "▼"} {deltaLabel}
            </span>
          </div>
          {trend.length > 1 ? (
            <>
              <div style={{ width: 1, height: 96, background: "rgba(255,255,255,.12)" }} />
              <svg viewBox="0 0 150 96" style={{ width: 150, height: 96 }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="bnFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="rgba(136,176,255,.35)" />
                    <stop offset="1" stopColor="rgba(136,176,255,0)" />
                  </linearGradient>
                </defs>
                <path d={fill} fill="url(#bnFill)" />
                <path d={line} fill="none" stroke="#8BB0FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <g fill="#5A6392" fontSize="9">
                  <text x="0" y="92">
                    {trend[0]?.label}
                  </text>
                  <text x="130" y="92">
                    {trend[trend.length - 1]?.label}
                  </text>
                </g>
              </svg>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
