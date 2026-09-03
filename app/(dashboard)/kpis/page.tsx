import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { FrostCard } from "@/components/ui/FrostCard";
import { KpiList } from "@/components/kpis/KpiList";
import { CreateKpiModal } from "@/components/kpis/CreateKpiModal";

export default async function KpisPage() {
  const actor = await getCurrentMember();
  if (actor.authRole !== "admin" && actor.authRole !== "hod") {
    redirect("/my-dashboard");
  }

  const teams = await prisma.team.findMany({
    where: actor.authRole === "admin" ? { orgId: actor.orgId } : { departmentId: actor.departmentId ?? "" },
    orderBy: { name: "asc" },
    include: {
      kpiTeams: { include: { kpi: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { members: true } },
    },
  });

  const activeCycle = await prisma.reviewCycle.findFirst({
    where:
      actor.authRole === "admin"
        ? { orgId: actor.orgId, status: "in_progress" }
        : { orgId: actor.orgId, departmentId: actor.departmentId, status: "in_progress" },
    orderBy: { startDate: "desc" },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div className="piq-h1">KPIs</div>
        <div className="piq-caption">
          {activeCycle ? `${activeCycle.label} · ${teams.length} teams` : "No active review cycle"}
        </div>
      </div>

      {teams.length === 0 ? (
        <FrostCard>
          <div className="piq-caption">No teams in scope yet.</div>
        </FrostCard>
      ) : (
        teams.map((team) => (
          <FrostCard key={team.id} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Link href={`/teams/${team.id}?tab=kpis`} className="piq-h3" style={{ textDecoration: "none" }}>
                {team.name}
              </Link>
              {activeCycle ? (
                <CreateKpiModal
                  cycleId={activeCycle.id}
                  teams={[{ id: team.id, name: team.name, memberCount: team._count.members, gradient: "8BB0FF,#3A63FA", icon: "ant-design:aim-outlined" }]}
                />
              ) : null}
            </div>
            {activeCycle ? (
              <KpiList
                rows={team.kpiTeams.map((kt) => ({
                  kpiTeamId: kt.id,
                  kpiId: kt.kpiId,
                  name: kt.kpi.name,
                  description: kt.kpi.description,
                  targetValue: kt.kpi.targetValue,
                  unit: kt.kpi.unit,
                  weightPct: kt.weightPct,
                  status: kt.kpi.status,
                }))}
              />
            ) : (
              <div className="piq-caption">Start a review cycle to add KPIs for this team.</div>
            )}
          </FrostCard>
        ))
      )}
    </div>
  );
}
