import Link from "next/link";

export interface PendingAction {
  icon: string;
  title: string;
  badgeLabel: string;
  badgeTone: "neutral" | "urgent" | "clear";
  count: number;
  actionLabel: string;
  href: string;
}

export function PendingActionsPanel({ actions }: { actions: PendingAction[] }) {
  const total = actions.reduce((s, a) => s + a.count, 0);

  return (
    <div
      style={{
        gridColumn: "span 4",
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
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Pending actions</div>
          <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>Awaiting your approval or assignment</div>
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
          {total} total
        </span>
      </div>
      {actions.length === 0 ? (
        <div className="piq-caption">Nothing pending right now.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {actions.map((a, i) => (
            <div key={a.title}>
              {i > 0 ? <div style={{ height: 1, background: "rgba(168,175,203,.22)", marginBottom: 12 }} /> : null}
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
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
                  <iconify-icon icon={a.icon} width="19" />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#252944" }}>{a.title}</div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "4px 10px",
                      borderRadius: 8,
                      marginTop: 4,
                      color: a.badgeTone === "urgent" ? "#fff" : a.badgeTone === "clear" ? "#273FF9" : "#596392",
                      background:
                        a.badgeTone === "urgent"
                          ? "#252944"
                          : a.badgeTone === "clear"
                            ? "rgba(58,99,250,.13)"
                            : "rgba(89,99,146,.14)",
                    }}
                  >
                    {a.badgeLabel}
                  </span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums", marginRight: 6 }}>
                  {a.count}
                </span>
                <Link
                  href={a.href}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(255,255,255,.55)",
                    border: "1px solid rgba(255,255,255,.75)",
                    borderRadius: 11,
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#273FF9",
                    textDecoration: "none",
                  }}
                >
                  {a.actionLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
