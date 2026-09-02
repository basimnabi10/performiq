import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

export interface HighlightRow {
  id: string;
  name: string;
  subtitle: string;
  score: number;
  rank?: number;
}

export function PeopleHighlightCard({
  title,
  actionLabel,
  rows,
  emptyText,
}: {
  title: string;
  actionLabel: string;
  rows: HighlightRow[];
  emptyText: string;
}) {
  return (
    <div
      style={{
        gridColumn: "span 3",
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 24,
        padding: 22,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>{title}</div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#273FF9" }}>{actionLabel}</span>
      </div>
      {rows.length === 0 ? (
        <div className="piq-caption">{emptyText}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/members/${r.id}`}
              style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: "inherit" }}
            >
              {r.rank != null ? (
                <span style={{ width: 22, fontSize: 13, fontWeight: 500, color: "#A8AFCB", fontVariantNumeric: "tabular-nums" }}>
                  {r.rank}
                </span>
              ) : null}
              <Avatar name={r.name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#252944" }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "#767FA5" }}>{r.subtitle}</div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>
                {r.score.toFixed(1)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
