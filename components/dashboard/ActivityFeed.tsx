export interface ActivityEntry {
  id: string;
  actorName: string;
  verb: string;
  createdAt: Date;
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <div className="piq-caption">No activity yet.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {entries.map((e) => (
        <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span>
            <strong>{e.actorName}</strong> {e.verb}
          </span>
          <span className="piq-caption">{relativeTime(e.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}
