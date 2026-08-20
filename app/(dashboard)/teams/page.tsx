import Link from "next/link";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";
import { FrostCard } from "@/components/ui/FrostCard";
import { CreateTeamModal } from "@/components/teams/CreateTeamModal";

export default async function TeamsPage() {
  const actor = await getCurrentMember();

  const teams = await prisma.team.findMany({
    where: { orgId: actor.orgId },
    orderBy: { name: "asc" },
    include: {
      lead: { select: { name: true } },
      members: { select: { id: true, name: true }, take: 5 },
      _count: { select: { members: true, kpiTeams: true } },
    },
  });

  const departments = await prisma.department.findMany({
    where: { orgId: actor.orgId },
    select: { id: true, name: true },
  });

  const canCreate = actor.authRole === "admin" || actor.authRole === "hod";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="piq-h1">Teams</div>
          <div className="piq-caption">
            {teams.length} teams · {teams.reduce((s, t) => s + t._count.members, 0)} members
          </div>
        </div>
        {canCreate ? <CreateTeamModal departments={departments} /> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 18 }}>
        {teams.map((team) => (
          <Link key={team.id} href={`/teams/${team.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <FrostCard style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="piq-h3">{team.name}</div>
              <div className="piq-caption">
                {team.lead ? `Lead: ${team.lead.name}` : "No lead assigned"} · {team._count.members} members ·{" "}
                {team._count.kpiTeams} KPIs
              </div>
              <div style={{ display: "flex", marginLeft: 4 }}>
                {team.members.map((m, i) => (
                  <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                    <Avatar name={m.name} size={32} round />
                  </div>
                ))}
              </div>
            </FrostCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
