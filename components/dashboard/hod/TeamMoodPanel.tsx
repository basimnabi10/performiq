const MOOD_SCALE = [
  { value: 5, emoji: "😄", label: "Great" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 1, emoji: "😣", label: "Struggling" },
];

export interface MoodNote {
  name: string;
  emoji: string;
  label: string;
  reason: string;
}

export function TeamMoodPanel({
  checkinCount,
  totalMembers,
  avgValue,
  distribution,
  notes,
}: {
  checkinCount: number;
  totalMembers: number;
  avgValue: number | null;
  distribution: Record<number, number>;
  notes: MoodNote[];
}) {
  const avgEntry = avgValue != null ? MOOD_SCALE.find((m) => Math.round(avgValue) === m.value) : null;

  return (
    <div
      style={{
        gridColumn: "span 4",
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 10px 30px rgba(70,100,190,.1)",
        borderRadius: 22,
        padding: 22,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Team mood today</div>
          <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>
            {checkinCount} of {totalMembers} checked in
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontSize: 26, lineHeight: 1 }}>{avgEntry?.emoji ?? "—"}</span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: "#181835", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
              {avgValue != null ? avgValue.toFixed(1) : "—"}
            </div>
            <div style={{ fontSize: 10, color: "#767FA5" }}>{avgValue != null ? "avg mood" : "no data"}</div>
          </div>
        </div>
      </div>

      {checkinCount === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              background: "rgba(89,99,146,.1)",
              color: "#767FA5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <iconify-icon icon="ant-design:smile-outlined" width="20" />
          </span>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#454D7A", marginTop: 11 }}>No check-ins today</div>
          <div className="piq-caption" style={{ marginTop: 3 }}>
            Mood check-ins appear here as your team logs them.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            {MOOD_SCALE.map((m) => (
              <div
                key={m.value}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 7,
                  padding: "11px 4px",
                  background: "rgba(255,255,255,.5)",
                  border: "1px solid rgba(168,175,203,.25)",
                  borderRadius: 13,
                }}
              >
                <span style={{ fontSize: 21, lineHeight: 1 }}>{m.emoji}</span>
                <span style={{ fontSize: 15, fontWeight: 500, color: "#181835", lineHeight: 1 }}>{distribution[m.value] ?? 0}</span>
                <span style={{ fontSize: 10, color: "#767FA5" }}>{m.label}</span>
              </div>
            ))}
          </div>
          {notes.length > 0 ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#767FA5", letterSpacing: ".05em", textTransform: "uppercase", margin: "16px 0 10px" }}>
                What people said
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {notes.map((n, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 11,
                      padding: "11px 13px",
                      background: "rgba(255,255,255,.5)",
                      border: "1px solid rgba(168,175,203,.25)",
                      borderRadius: 13,
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>{n.emoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#181835" }}>
                        {n.name} <span style={{ fontWeight: 400, color: "#767FA5" }}>· {n.label}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#454D7A", marginTop: 2, lineHeight: 1.5 }}>{n.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
