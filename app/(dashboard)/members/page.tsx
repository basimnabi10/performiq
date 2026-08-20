import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
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

  const canInvite = actor.authRole === "admin" || actor.authRole === "hod";

  const filterOptions = [
    { id: "all", label: "All teams", count: teams.reduce((sum, t) => sum + t._count.members, 0) },
    ...teams.map((t) => ({ id: t.id, label: t.name, count: t._count.members })),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="piq-h1">Members</div>
          <div className="piq-caption">{members.length} people across your organization</div>
        </div>
        {canInvite ? <InviteMemberModal teams={teams} /> : null}
      </div>

      <TeamFilterTabs options={filterOptions} activeId={teamFilter} basePath="/members" />

      <FrostCard>
        <MembersTable
          rows={members.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            jobTitle: m.jobTitle,
            teamName: m.team?.name ?? null,
            status: m.status,
          }))}
        />
      </FrostCard>
    </div>
  );
}
