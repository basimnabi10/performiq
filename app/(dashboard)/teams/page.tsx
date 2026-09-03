import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { TeamCard } from "@/components/teams/TeamCard";
import { CreateTeamModal } from "@/components/teams/CreateTeamModal";

const TEAM_GRADIENTS = ["8BB0FF,#3A63FA", "A8AFCB,#596392", "C8CBE1,#6262A8", "B8BED6,#767FA5"];
const TEAM_SHADOWS = ["rgba(58,99,250,.3)", "rgba(89,99,146,.3)", "rgba(98,98,168,.3)", "rgba(118,127,165,.3)"];
const TEAM_ICONS = [
  "ant-design:bg-colors-outlined",
  "ant-design:appstore-outlined",
  "ant-design:cluster-outlined",
  "ant-design:apartment-outlined",
];

export default async function TeamsPage() {
  const actor = await getCurrentMember();
  const isOrgWide = actor.authRole === "admin";

  const departmentName = isOrgWide
    ? "Organization"
    : (await prisma.department.findUnique({ where: { id: actor.departmentId ?? "" }, select: { name: true } }))?.name ?? "Department";
  const breadcrumb = isOrgWide ? "Organization" : `${departmentName} Department`;

  const teamWhere = isOrgWide ? { orgId: actor.orgId } : { departmentId: actor.departmentId ?? "" };

  const [teams, departments, activeCycle] = await Promise.all([
    prisma.team.findMany({
      where: teamWhere,
      orderBy: { name: "asc" },
      include: {
        lead: { select: { name: true } },
        members: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
    }),
    prisma.department.findMany({ where: { orgId: actor.orgId }, select: { id: true, name: true } }),
    prisma.reviewCycle.findFirst({
      where: isOrgWide
        ? { orgId: actor.orgId, status: "in_progress" }
        : { orgId: actor.orgId, departmentId: actor.departmentId, status: "in_progress" },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const allMemberIds = teams.flatMap((t) => t.members.map((m) => m.id));

  const [memberKpiScores, reviews, kpiTeams] = activeCycle
    ? await Promise.all([
        prisma.memberKpiScore.findMany({ where: { cycleId: activeCycle.id, memberId: { in: allMemberIds } } }),
        prisma.review.findMany({ where: { cycleId: activeCycle.id, revieweeId: { in: allMemberIds } } }),
        prisma.kpiTeam.findMany({
          where: { teamId: { in: teams.map((t) => t.id) }, kpi: { cycleId: activeCycle.id } },
          select: { teamId: true },
        }),
      ])
    : [[], [], []];

  const memberAvg = new Map<string, number>();
  for (const memberId of allMemberIds) {
    const scores = memberKpiScores.filter((s) => s.memberId === memberId);
    if (scores.length) memberAvg.set(memberId, scores.reduce((s, r) => s + Number(r.score), 0) / scores.length);
  }

  const canCreate = actor.authRole === "admin" || actor.authRole === "hod";
  const totalMembers = teams.reduce((s, t) => s + t.members.length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
        <div>
          <div style={{ fontSize: 14, color: "#767FA5", fontWeight: 500 }}>{breadcrumb}</div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", marginTop: 2 }}>Teams</div>
          <div style={{ fontSize: 14, color: "#596392", marginTop: 3 }}>
            {teams.length} teams · {totalMembers} members
            {activeCycle ? ` · ${activeCycle.label} cycle` : ""}
          </div>
        </div>
        {canCreate ? <CreateTeamModal departments={departments} /> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {teams.map((team, i) => {
          const orderedMembers = team.members.slice().sort((a, b) => {
            if (a.id === team.leadMemberId) return -1;
            if (b.id === team.leadMemberId) return 1;
            return a.name.localeCompare(b.name);
          });
          const teamMemberIds = team.members.map((m) => m.id);
          const teamScores = teamMemberIds.map((id) => memberAvg.get(id)).filter((v): v is number => v != null);
          const avgScore = teamScores.length ? teamScores.reduce((s, v) => s + v, 0) / teamScores.length : null;
          const teamReviews = reviews.filter((r) => teamMemberIds.includes(r.revieweeId));
          const completionPct = teamReviews.length
            ? Math.round((teamReviews.filter((r) => r.status === "completed").length / teamReviews.length) * 100)
            : 0;
          const kpiCount = kpiTeams.filter((kt) => kt.teamId === team.id).length;

          return (
            <TeamCard
              key={team.id}
              teamId={team.id}
              name={team.name}
              leadName={team.lead?.name ?? null}
              memberCount={team.members.length}
              members={orderedMembers}
              avgScore={avgScore}
              kpiCount={kpiCount}
              completionPct={completionPct}
              deltaLabel={null}
              deltaUp
              gradient={TEAM_GRADIENTS[i % TEAM_GRADIENTS.length]}
              shadowColor={TEAM_SHADOWS[i % TEAM_SHADOWS.length]}
              icon={TEAM_ICONS[i % TEAM_ICONS.length]}
            />
          );
        })}
      </div>
    </div>
  );
}
