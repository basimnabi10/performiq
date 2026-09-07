import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { findActiveCycle } from "@/lib/cycles";
import { FrostCard } from "@/components/ui/FrostCard";
import { MembersTable } from "@/components/members/MembersTable";
import { TeamFilterTabs } from "@/components/members/TeamFilterTabs";
import { InviteMemberModal } from "@/components/members/InviteMemberModal";

export default async function MembersPage({ searchParams }: PageProps<"/members">) {
  const { team: rawTeamFilter } = await searchParams;
  const teamFilter = Array.isArray(rawTeamFilter) ? rawTeamFilter[0] : rawTeamFilter;
  const actor = await getCurrentMember();

  const teams = await prisma.team.findMany({
    where: { orgId: actor.orgId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { members: true } } },
  });

  const members = await prisma.member.findMany({
    where: {
      orgId: actor.orgId,
      ...(teamFilter ? { teamId: teamFilter } : {}),
    },
    orderBy: { name: "asc" },
    include: { team: { select: { name: true } } },
  });

  const activeCycle = await findActiveCycle(actor);

  const memberIds = members.map((m) => m.id);
  const [manageReviews, kpiScores] = activeCycle
    ? await Promise.all([
        prisma.review.findMany({
          where: { cycleId: activeCycle.id, revieweeId: { in: memberIds }, type: "manager" },
          select: { revieweeId: true, status: true },
        }),
        prisma.memberKpiScore.findMany({
          where: { cycleId: activeCycle.id, memberId: { in: memberIds } },
          select: { memberId: true, score: true },
        }),
      ])
    : [[], []];

  const reviewByMember = new Map(manageReviews.map((r) => [r.revieweeId, r.status]));
  const scoreByMember = new Map<string, number[]>();
  for (const s of kpiScores) {
    scoreByMember.set(s.memberId, [...(scoreByMember.get(s.memberId) ?? []), Number(s.score)]);
  }
  const cycleOverdue = activeCycle ? new Date() > activeCycle.endDate : false;

  function reviewStatusFor(memberId: string, status: string): "reviewed" | "in_progress" | "overdue" | "not_started" | "invited" {
    if (status === "invited") return "invited";
    if (!activeCycle) return "not_started";
    const reviewStatus = reviewByMember.get(memberId);
    if (reviewStatus === "completed") return "reviewed";
    if (!reviewStatus) return "not_started";
    return cycleOverdue ? "overdue" : "in_progress";
  }

  const canInvite = actor.authRole === "admin" || actor.authRole === "hod";

  const filterOptions = [
    { id: "all", label: "All teams", count: teams.reduce((sum, t) => sum + t._count.members, 0) },
    ...teams.map((t) => ({
      id: t.id,
      label: t.name,
      count: t._count.members,
      icon: t.name.toLowerCase().includes("design") ? "ant-design:bg-colors-outlined" : "ant-design:appstore-outlined",
    })),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="piq-h1">Members</div>
          <div className="piq-caption">
            {members.length} people{activeCycle ? ` · ${activeCycle.label} cycle` : ""}
          </div>
        </div>
        {canInvite ? <InviteMemberModal teams={teams} /> : null}
      </div>

      <TeamFilterTabs options={filterOptions} activeId={teamFilter} basePath="/members" />

      <FrostCard>
        <MembersTable
          rows={members.map((m) => {
            const scores = scoreByMember.get(m.id);
            return {
              id: m.id,
              name: m.name,
              email: m.email,
              jobTitle: m.jobTitle,
              teamName: m.team?.name ?? null,
              reviewStatus: reviewStatusFor(m.id, m.status),
              kpiScore: scores?.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null,
            };
          })}
        />
      </FrostCard>
    </div>
  );
}
