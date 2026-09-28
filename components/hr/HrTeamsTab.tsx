"use client";

import type { HrDashboard } from "@/lib/hr-shape";
import { GLASS, ROW, deltaLabel, deltaStyle, scorePos } from "./hrStyles";

const COLUMNS = "minmax(190px,1.4fr) minmax(130px,1fr) 90px minmax(200px,1.8fr) minmax(150px,1.2fr) 90px";

export function HrTeamsTab({ data }: { data: HrDashboard }) {
  const { teamRows, previousLabel, selectedLabel } = data;

  return (
    <div style={{ ...GLASS, padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Teams across the company</div>
          <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>
            Averages use submitted {selectedLabel} reviews only.
            {previousLabel ? ` Change compares the same people against their ${previousLabel} score.` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#596392" }}>
            <span style={{ width: 16, height: 8, borderRadius: 4, background: "linear-gradient(90deg,#3A63FA,#273FF9)" }} />
            {selectedLabel} average
          </span>
          {previousLabel ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#596392" }}>
              <span style={{ width: 2, height: 12, borderRadius: 2, background: "#181835" }} />
              {previousLabel} average
            </span>
          ) : null}
        </div>
      </div>

      {teamRows.length === 0 ? (
        <div style={{ fontSize: 13, color: "#767FA5" }}>No teams have been created yet.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 900, display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: COLUMNS,
                gap: 16,
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 500,
                color: "#767FA5",
                letterSpacing: ".04em",
                textTransform: "uppercase",
              }}
            >
              <span>Team</span>
              <span>HOD</span>
              <span style={{ textAlign: "right" }}>Headcount</span>
              <span>Average score</span>
              <span>Review completion</span>
              <span style={{ textAlign: "right" }}>{previousLabel ? `vs ${previousLabel}` : "Change"}</span>
            </div>

            {teamRows.map((t) => {
              const completion = t.total ? Math.round((t.done / t.total) * 100) : 0;
              return (
                <div key={t.teamId} style={{ ...ROW, display: "grid", gridTemplateColumns: COLUMNS, gap: 16, alignItems: "center", padding: "14px 12px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "#767FA5" }}>{t.department}</div>
                  </div>
                  <span style={{ fontSize: 13, color: t.hod ? "#454D7A" : "#A8AFCB" }}>{t.hod ?? "Not set"}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#181835", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{t.headcount}</span>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, position: "relative", height: 8, borderRadius: 99, background: "rgba(202,205,220,.45)" }}>
                      {t.avg != null ? (
                        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${scorePos(t.avg)}%`, borderRadius: 99, background: "linear-gradient(90deg,#3A63FA,#273FF9)" }} />
                      ) : null}
                      {t.prevAvg != null ? (
                        <span title={`${previousLabel}: ${t.prevAvg.toFixed(1)}`} style={{ position: "absolute", left: `${scorePos(t.prevAvg)}%`, top: -3, bottom: -3, width: 2, borderRadius: 2, background: "#181835" }} />
                      ) : null}
                    </div>
                    <span style={{ width: 34, fontSize: 14, fontWeight: 500, color: t.avg != null ? "#181835" : "#A8AFCB", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {t.avg != null ? t.avg.toFixed(1) : "—"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 8, borderRadius: 99, background: "rgba(202,205,220,.45)", overflow: "hidden" }}>
                      <span style={{ display: "block", width: `${completion}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#8BB0FF,#3A63FA)" }} />
                    </div>
                    <span style={{ width: 62, fontSize: 12, color: "#454D7A", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {t.done}/{t.total}
                    </span>
                  </div>

                  <span style={deltaStyle(t.delta)}>{deltaLabel(t.delta)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
