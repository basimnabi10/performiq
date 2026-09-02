import { Avatar } from "@/components/ui/Avatar";

export interface ActivityRow {
  id: string;
  actorName: string;
  verb: string;
  timeAgo: string;
}

export function RecentActivityFeed({ rows }: { rows: ActivityRow[] }) {
  return (
    <div
      style={{
        gridColumn: "span 6",
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 24,
        padding: 22,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 500, color: "#181835", marginBottom: 16 }}>Recent activity</div>
      {rows.length === 0 ? (
        <div className="piq-caption">No activity yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 40px" }}>
          {rows.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Avatar name={r.actorName} size={32} />
              <div style={{ flex: 1, fontSize: 13, color: "#454D7A" }}>
                <span style={{ fontWeight: 500, color: "#252944" }}>{r.actorName}</span> {r.verb}
              </div>
              <span style={{ fontSize: 11, color: "#A8AFCB", flexShrink: 0 }}>{r.timeAgo}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
