import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { findActiveCycle } from "@/lib/cycles";
import { FrostCard } from "@/components/ui/FrostCard";
import { EmptyState } from "@/components/ui/EmptyState";

const TEAM_GRADIENTS = [
  "linear-gradient(135deg,#8BB0FF,#3A63FA)",
  "linear-gradient(135deg,#A8AFCB,#596392)",
  "linear-gradient(135deg,#C8CBE1,#6262A8)",
  "linear-gradient(135deg,#B8BED6,#767FA5)",
];

/**
 * Step one of running a month's reviews: pick a team.
 *
 * Reviews are listed flat on /reviews, which answers "what is outstanding".
 * This answers "I am sitting down to review my people now" -- a different
 * job, and the reason it is worth its own path rather than another filter on
 * that list.
 */
export default async function KpiReviewPage() {
  const actor = await getCurrentMember();
  if (actor.authRole === "ic") redirect("/my-dashboard");

  const cycle = await findActiveCycle(actor);

  const teams = await prisma.team.findMany({
    where: actor.authRole === "admin" ? { orgId: actor.orgId } : { departmentId: actor.departmentId ?? "" },
    orderBy: { name: "asc" },
    include: {
      department: { select: { name: true } },
      _count: { select: { members: true } },
    },
  });

  if (!cycle) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="piq-h1">Create KPI review</div>
        <EmptyState
          icon="ant-design:calendar-outlined"
          title="No review month is open"
          body="Months open automatically on the 1st. Once this month's cycle is open, its reviews appear here."
        />
      </div>
    );
  }

  const memberIds = (
    await prisma.member.findMany({
      where: { teamId: { in: teams.map((t) => t.id) } },
      select: { id: true, teamId: true },
    })
  );

  // Only manager reviews count towards a team's progress: a self-review is
  // the member's own to complete, and counting it here would show progress
  // the reviewer has not made.
  const reviews = await prisma.review.findMany({
    where: { cycleId: cycle.id, revieweeId: { in: memberIds.map((m) => m.id) }, type: "manager" },
    select: { revieweeId: true, status: true },
  });

  const teamCards = teams.map((t, i) => {
    const ids = memberIds.filter((m) => m.teamId === t.id).map((m) => m.id);
    const mine = reviews.filter((r) => ids.includes(r.revieweeId));
    const done = mine.filter((r) => r.status === "completed").length;
    return {
      id: t.id,
      name: t.name,
      department: t.department?.name ?? "",
      size: t._count.members,
      pending: Math.max(t._count.members - done, 0),
      done,
      gradient: TEAM_GRADIENTS[i % TEAM_GRADIENTS.length],
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div className="piq-caption" style={{ textTransform: "uppercase", letterSpacing: ".04em" }}>
          {cycle.label} review
        </div>
        <div className="piq-h1" style={{ marginTop: 2 }}>
          Create KPI review
        </div>
        <div className="piq-body" style={{ marginTop: 4 }}>
          Select a team to begin reviewing employees for the {cycle.label} review cycle.
        </div>
      </div>

      {teamCards.length === 0 ? (
        <EmptyState
          icon="ant-design:team-outlined"
          title="No teams yet"
          body="Create a team and add people to it before running reviews."
          actionHref="/teams"
          actionLabel="Go to teams"
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 18 }}>
          {teamCards.map((t) => (
            <Link key={t.id} href={`/kpi-review/${t.id}`} style={{ textDecoration: "none" }}>
              <FrostCard tone="solid" padding={20} style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 40, height: 40, borderRadius: 12, background: t.gradient, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 500, color: "var(--text-strong)" }}>{t.name}</div>
                    <div className="piq-caption">{t.department}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 500, color: "var(--text-strong)" }}>{t.size}</div>
                    <div className="piq-caption">Employees</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 500, color: t.pending ? "#B4530A" : "#1B7A48" }}>
                      {t.pending}
                    </div>
                    <div className="piq-caption">Pending</div>
                  </div>
                </div>

                <div style={{ marginTop: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="piq-caption">Review progress</span>
                    <span className="piq-caption" style={{ color: "var(--text-body)" }}>
                      {t.done} / {t.size}
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "rgba(168,175,203,.3)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${t.size ? (t.done / t.size) * 100 : 0}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: "linear-gradient(90deg,#3A63FA,#273FF9)",
                      }}
                    />
                  </div>
                </div>
              </FrostCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
