import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";

export interface MembersTableRow {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  teamName: string | null;
  status: "active" | "invited";
}

export function MembersTable({ rows }: { rows: MembersTableRow[] }) {
  if (rows.length === 0) {
    return <div className="piq-caption">No members match these filters.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((m) => (
        <Link
          key={m.id}
          href={`/members/${m.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 18px",
            borderRadius: 16,
            background: "rgba(255,255,255,.35)",
            border: "1px solid rgba(255,255,255,.5)",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <Avatar name={m.name} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>{m.name}</div>
            <div className="piq-caption">{m.email}</div>
          </div>
          <div className="piq-caption" style={{ width: 160 }}>
            {m.jobTitle ?? "—"}
          </div>
          <div className="piq-caption" style={{ width: 150 }}>
            {m.teamName ?? "Unassigned"}
          </div>
          <Tag tone={m.status === "active" ? "onTrack" : "neutral"} dot>
            {m.status === "active" ? "Active" : "Invitation pending"}
          </Tag>
        </Link>
      ))}
    </div>
  );
}
