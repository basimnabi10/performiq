import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

export type ReviewStatusKind = "reviewed" | "in_progress" | "overdue" | "not_started" | "invited";

export interface MembersTableRow {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  teamName: string | null;
  reviewStatus: ReviewStatusKind;
  kpiScore: number | null;
}

const REVIEW_STATUS_STYLE: Record<ReviewStatusKind, { label: string; color: string; bg: string }> = {
  reviewed: { label: "Reviewed", color: "#273FF9", bg: "rgba(58,99,250,.13)" },
  in_progress: { label: "In progress", color: "#596392", bg: "rgba(89,99,146,.14)" },
  not_started: { label: "Not started", color: "#596392", bg: "rgba(89,99,146,.14)" },
  overdue: { label: "Review overdue", color: "#fff", bg: "#252944" },
  invited: { label: "Invited", color: "#596392", bg: "rgba(89,99,146,.14)" },
};

const GRID_COLUMNS = "1fr 190px 160px 110px 40px";
const GRID_COLUMNS_NO_TEAM = "1fr 200px 130px 120px 44px";

export function MembersTable({
  rows,
  /** Team-detail pages already say which team you're on — the per-row team
   * pill is pure noise there, so the column collapses to a plain role. */
  showTeam = true,
}: {
  rows: MembersTableRow[];
  showTeam?: boolean;
}) {
  const grid = showTeam ? GRID_COLUMNS : GRID_COLUMNS_NO_TEAM;
  if (rows.length === 0) {
    return <div className="piq-caption">No members match these filters.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 720 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: grid,
            gap: 16,
            padding: "0 20px 10px",
            fontSize: 11,
            fontWeight: 500,
            color: "#767FA5",
            letterSpacing: ".05em",
            textTransform: "uppercase",
          }}
        >
          <div>Member</div>
          <div>{showTeam ? "Team & role" : "Role"}</div>
          <div>Review status</div>
          <div>KPI score</div>
          <div />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((m) => {
            const status = REVIEW_STATUS_STYLE[m.reviewStatus];
            return (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: grid,
                  gap: 16,
                  alignItems: "center",
                  padding: "16px 20px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,.35)",
                  border: "1px solid rgba(255,255,255,.5)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
                  <Avatar name={m.name} size={38} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>{m.name}</div>
                    <div className="piq-caption">{m.email}</div>
                  </div>
                </div>

                {showTeam ? (
                  <div>
                    <span
                      style={{
                        display: "inline-flex",
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "3px 9px",
                        borderRadius: 7,
                        color: m.teamName === "Product Design" ? "#273FF9" : "#596392",
                        background: m.teamName === "Product Design" ? "rgba(58,99,250,.13)" : "rgba(89,99,146,.14)",
                      }}
                    >
                      {m.teamName ?? "Unassigned"}
                    </span>
                    <div style={{ fontSize: 12, color: "#767FA5", marginTop: 4 }}>{m.jobTitle ?? "—"}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: "#454D7A" }}>{m.jobTitle ?? "—"}</div>
                )}

                <div>
                  <span style={{ display: "inline-flex", fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 8, color: status.color, background: status.bg }}>
                    {status.label}
                  </span>
                </div>

                <div style={{ fontSize: 16, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>
                  {m.kpiScore != null ? (
                    <>
                      {m.kpiScore.toFixed(1)}
                      <span style={{ fontSize: 12, color: "#A8AFCB" }}>/5</span>
                    </>
                  ) : (
                    <>
                      —<span style={{ fontSize: 12, color: "#A8AFCB" }}> pending</span>
                    </>
                  )}
                </div>

                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "rgba(58,99,250,.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#273FF9",
                  }}
                >
                  <iconify-icon icon="ant-design:arrow-right-outlined" width={15} />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
