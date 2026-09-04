import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

export interface MoverRow {
  memberId: string;
  name: string;
  roleTeam: string;
  score: number;
  delta: number | null;
}

export function BiggestMoversPanel({ movers }: { movers: MoverRow[] }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 20,
        padding: "20px 22px",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Biggest movers</div>
      <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>Change vs the previous cycle</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {movers.length === 0 ? (
          <div className="piq-caption">Not enough cycle history yet to compare.</div>
        ) : (
          movers.map((m) => {
            const up = m.delta == null || m.delta >= 0;
            return (
              <Link
                key={m.memberId}
                href={`/members/${m.memberId}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,.5)",
                  border: "1px solid rgba(168,175,203,.25)",
                  borderRadius: 13,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <Avatar name={m.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#181835", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "#767FA5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.roleTeam}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>{m.score.toFixed(1)}</div>
                  <div style={{ fontSize: 11, color: "#767FA5" }}>out of 5</div>
                </div>
                {m.delta != null ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "3px 8px",
                      borderRadius: 7,
                      fontVariantNumeric: "tabular-nums",
                      flexShrink: 0,
                      color: up ? "#273FF9" : "#8A6D00",
                      background: up ? "rgba(58,99,250,.13)" : "rgba(199,140,0,.14)",
                    }}
                  >
                    <iconify-icon icon={up ? "ant-design:arrow-up-outlined" : "ant-design:arrow-down-outlined"} width="11" />
                    {up ? "+" : ""}
                    {m.delta.toFixed(1)}
                  </span>
                ) : null}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
