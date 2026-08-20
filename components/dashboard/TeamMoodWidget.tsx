const EMOJI: Record<number, string> = { 5: "😄", 4: "🙂", 3: "😐", 2: "😕", 1: "😣" };

export interface MoodEntry {
  memberName: string;
  value: number;
  reason: string | null;
}

export function TeamMoodWidget({ entries }: { entries: MoodEntry[] }) {
  if (entries.length === 0) {
    return <div className="piq-caption">No mood check-ins yet today.</div>;
  }

  const avg = entries.reduce((s, e) => s + e.value, 0) / entries.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 28 }}>{EMOJI[Math.round(avg)]}</span>
        <span style={{ fontSize: 20, fontWeight: 500 }}>{avg.toFixed(1)} / 5</span>
        <span className="piq-caption">{entries.length} checked in today</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {entries
          .filter((e) => e.reason)
          .map((e, i) => (
            <div key={i} className="piq-caption">
              {EMOJI[e.value]} <strong>{e.memberName}</strong>: {e.reason}
            </div>
          ))}
      </div>
    </div>
  );
}
