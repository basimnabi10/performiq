"use client";

import { FLAT_SPREAD, type HrDashboard, type HrStrip } from "@/lib/hr-shape";
import { AXIS_TICKS, GLASS, TAG_BASE, TRACK_STYLE, scorePos } from "./hrStyles";

function Axis({ leftGutter, rightGutter }: { leftGutter: number; rightGutter: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <span style={{ width: leftGutter, flexShrink: 0 }} />
      <div style={{ flex: 1, position: "relative", height: 14, minWidth: 160 }}>
        <div style={TRACK_STYLE}>
        {AXIS_TICKS.map((t) => (
          <span
            key={t}
            style={{
              position: "absolute",
              left: `${scorePos(t)}%`,
              transform: "translateX(-50%)",
              fontSize: 10,
              color: "#A8AFCB",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {t.toFixed(1)}
          </span>
        ))}
        </div>
      </div>
      <span style={{ width: rightGutter, flexShrink: 0 }} />
    </div>
  );
}

/**
 * One reviewer or department as a strip: every submitted score as a dot, the
 * range as a bar, the mean as a line. Read side by side, two strips show
 * whether two people are marking to the same standard.
 */
function Strip({ strip, height }: { strip: HrStrip; height: number }) {
  return (
    <div style={{ flex: 1, position: "relative", height, minWidth: 160, borderRadius: 12, background: "rgba(255,255,255,.35)" }}>
      <div style={TRACK_STYLE}>
      {AXIS_TICKS.map((t) => (
        <span key={t} style={{ position: "absolute", left: `${scorePos(t)}%`, top: 6, bottom: 6, width: 1, background: "rgba(168,175,203,.25)" }} />
      ))}
      {strip.min != null && strip.max != null ? (
        <span
          style={{
            position: "absolute",
            left: `${scorePos(strip.min)}%`,
            width: `${scorePos(strip.max) - scorePos(strip.min)}%`,
            top: "50%",
            height: 4,
            marginTop: -2,
            borderRadius: 2,
            background: "rgba(58,99,250,.22)",
          }}
        />
      ) : null}
      {strip.mean != null ? (
        <span title={`Mean ${strip.mean.toFixed(1)}`} style={{ position: "absolute", left: `${scorePos(strip.mean)}%`, top: 8, bottom: 8, width: 2, marginLeft: -1, borderRadius: 2, background: "#181835" }} />
      ) : null}
      {strip.scores.map((v, i) => (
        <span
          key={i}
          title={v.toFixed(1)}
          style={{
            position: "absolute",
            left: `${scorePos(v)}%`,
            // Fan the dots vertically so identical scores stay countable.
            top: `${28 + ((i % 3) - 1) * 18}%`,
            width: 9,
            height: 9,
            marginLeft: -4.5,
            borderRadius: "50%",
            background: "#273FF9",
            border: "1.5px solid rgba(255,255,255,.85)",
          }}
        />
      ))}
      </div>
    </div>
  );
}

function rangeLabel(s: HrStrip) {
  return s.min != null && s.max != null ? `${s.min.toFixed(1)}–${s.max.toFixed(1)}` : "—";
}

export function HrCalibrationTab({ data }: { data: HrDashboard }) {
  const { histogram, deptStrips, reviewerStrips, selectedLabel } = data;
  const maxCount = Math.max(1, ...histogram.map((h) => h.count));
  const totalScored = histogram.reduce((s, h) => s + h.count, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
        <div style={{ ...GLASS, flex: "1 1 300px", minWidth: 0, padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Company score distribution</div>
            <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>
              {totalScored
                ? `${totalScored} submitted ${totalScored === 1 ? "review" : "reviews"} in ${selectedLabel}.`
                : `Nothing has been submitted in ${selectedLabel} yet.`}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 170, paddingTop: 18 }}>
            {histogram.map((h) => (
              <div key={h.label} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>{h.count}</span>
                <span
                  style={{
                    width: "100%",
                    height: `${(h.count / maxCount) * 100}%`,
                    minHeight: h.count ? 6 : 2,
                    borderRadius: 10,
                    background: h.count ? "linear-gradient(180deg,#3A63FA,#273FF9)" : "rgba(202,205,220,.45)",
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: -8 }}>
            {histogram.map((h) => (
              <span key={h.label} style={{ flex: 1, textAlign: "center", fontSize: 11, color: "#767FA5" }}>
                {h.label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ ...GLASS, padding: 22, display: "flex", flexDirection: "column", gap: 14, flex: "2 1 520px", minWidth: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>By department</div>
            <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>Each dot is one submitted review. The dark line is the department mean.</div>
          </div>
          {deptStrips.length === 0 ? (
            <div style={{ fontSize: 13, color: "#767FA5" }}>No department has a submitted review this month.</div>
          ) : (
            <div style={{ overflowX: "auto", margin: "0 -4px", padding: "0 4px" }}>
              <div style={{ minWidth: 560, display: "flex", flexDirection: "column", gap: 14 }}>
                <Axis leftGutter={170} rightGutter={150} />
                {deptStrips.map((r) => (
                  <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 170, flexShrink: 0, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: "#767FA5" }}>{r.sub}</div>
                    </div>
                    <Strip strip={r} height={46} />
                    <div style={{ width: 150, flexShrink: 0, textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>{r.mean?.toFixed(1) ?? "—"}</div>
                      <div style={{ fontSize: 11, color: "#767FA5", fontVariantNumeric: "tabular-nums" }}>
                        {r.scores.length} {r.scores.length === 1 ? "review" : "reviews"} · {rangeLabel(r)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ ...GLASS, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>By reviewer</div>
          <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>
            Whether reviewers are marking to the same standard. A reviewer whose scores all land within{" "}
            {FLAT_SPREAD.toFixed(1)} of each other is flagged — that usually means the scale was not used, not that a
            team is uniform.
          </div>
        </div>
        {reviewerStrips.length === 0 ? (
          <div style={{ fontSize: 13, color: "#767FA5" }}>No reviewer has submitted a review this month.</div>
        ) : (
          <div style={{ overflowX: "auto", margin: "0 -4px", padding: "0 4px" }}>
            <div style={{ minWidth: 780, display: "flex", flexDirection: "column", gap: 14 }}>
              <Axis leftGutter={200} rightGutter={290} />
              {reviewerStrips.map((r) => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 200, flexShrink: 0, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: "#767FA5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sub}</div>
                  </div>
                  <Strip strip={r} height={50} />
                  <div style={{ width: 130, flexShrink: 0, textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>{r.mean?.toFixed(1) ?? "—"}</div>
                    <div style={{ fontSize: 11, color: "#767FA5", fontVariantNumeric: "tabular-nums" }}>
                      {r.scores.length} {r.scores.length === 1 ? "review" : "reviews"} · {rangeLabel(r)}
                    </div>
                  </div>
                  <div style={{ width: 144, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
                    {r.flat ? (
                      <span style={{ ...TAG_BASE, color: "#fff", background: "#2C3158" }}>Little spread</span>
                    ) : r.scores.length < 3 ? (
                      <span style={{ ...TAG_BASE, color: "#454D7A", background: "rgba(255,255,255,.55)", boxShadow: "inset 0 0 0 1px #A8AFCB" }}>
                        Too few to judge
                      </span>
                    ) : (
                      <span style={{ ...TAG_BASE, color: "#273FF9", background: "rgba(58,99,250,.13)" }}>Uses the scale</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
