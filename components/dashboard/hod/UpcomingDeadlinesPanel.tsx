export interface Deadline {
  icon: string;
  title: string;
  meta: string;
  urgent?: boolean;
}

export function UpcomingDeadlinesPanel({ deadlines }: { deadlines: Deadline[] }) {
  return (
    <div
      style={{
        gridColumn: "span 2",
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 24,
        padding: 22,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Upcoming deadlines</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#273FF9" }}>Calendar</span>
      </div>
      {deadlines.length === 0 ? (
        <div className="piq-caption">Nothing on the calendar yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {deadlines.map((d, i) =>
            d.urgent ? (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "rgba(37,41,68,.06)",
                  border: "1px solid rgba(37,41,68,.1)",
                  borderRadius: 14,
                  padding: 13,
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "#252944",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <iconify-icon icon={d.icon} width="19" />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#181835" }}>{d.title}</div>
                  <div style={{ fontSize: 11, color: "#596392" }}>{d.meta}</div>
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
                    color: "#fff",
                    background: "#252944",
                  }}
                >
                  Urgent
                </span>
              </div>
            ) : (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(58,99,250,.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#273FF9",
                    flexShrink: 0,
                  }}
                >
                  <iconify-icon icon={d.icon} width="19" />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>{d.title}</div>
                  <div style={{ fontSize: 11, color: "#767FA5" }}>{d.meta}</div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
