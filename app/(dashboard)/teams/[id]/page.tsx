import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { FrostCard } from "@/components/ui/FrostCard";
import { MembersTable } from "@/components/members/MembersTable";
import { InviteMemberModal } from "@/components/members/InviteMemberModal";
import { KpiList } from "@/components/kpis/KpiList";
import { CreateKpiModal } from "@/components/kpis/CreateKpiModal";

export default async function TeamDetailPage({ params, searchParams }: PageProps<"/teams/[id]">) {
  const { id } = await params;
  const { tab } = await searchParams;
  const actor = await getCurrentMember();

  const team = await prisma.team.findFirst({
    where: { id, orgId: actor.orgId },
    include: {
      lead: { select: { name: true } },
      members: { orderBy: { name: "asc" }, include: { team: { select: { name: true } } } },
      kpiTeams: { include: { kpi: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!team) notFound();

  const activeCycle = await prisma.reviewCycle.findFirst({
    where: {
      orgId: actor.orgId,
      status: "in_progress",
      OR: [{ departmentId: team.departmentId }, { departmentId: null }],
    },
    orderBy: { startDate: "desc" },
  });

  const activeTab = tab === "kpis" ? "kpis" : "members";
  // Invite/create-KPI are admin/hod-only actions (see actions/members.ts,
  // actions/kpis.ts) — managers get team-scoped visibility here, not these
  // management actions, so the buttons stay hidden for them rather than
  // appearing and then failing server-side.
  const canManage =
    actor.authRole === "admin" || (actor.authRole === "hod" && actor.departmentId === team.departmentId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/teams" className="piq-caption" style={{ textDecoration: "none" }}>
        ← Back to teams
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="piq-h1">{team.name}</div>
          <div className="piq-caption">
            {team.members.length} members · {team.kpiTeams.length} KPIs
            {team.lead ? ` · Lead: ${team.lead.name}` : ""}
          </div>
        </div>
        {canManage ? (
          activeTab === "members" ? (
            <InviteMemberModal teams={[{ id: team.id, name: team.name }]} simple />
          ) : activeCycle ? (
            <CreateKpiModal cycleId={activeCycle.id} teamId={team.id} />
          ) : null
        ) : null}
      </div>

      <div style={{ display: "inline-flex", gap: 4 }}>
        {(["members", "kpis"] as const).map((t) => {
          const active = t === activeTab;
          return (
            <Link
              key={t}
              href={`/teams/${team.id}${t === "kpis" ? "?tab=kpis" : ""}`}
              style={{
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? "#fff" : "#596392",
                background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "rgba(255,255,255,.4)",
                padding: "8px 16px",
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              {t === "members" ? "Members" : "KPIs"}
            </Link>
          );
        })}
      </div>

      <FrostCard>
        {activeTab === "members" ? (
          <MembersTable
            rows={team.members.map((m) => ({
              id: m.id,
              name: m.name,
              email: m.email,
              jobTitle: m.jobTitle,
              teamName: m.team?.name ?? null,
              status: m.status,
            }))}
          />
        ) : activeCycle ? (
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
          <div className="piq-caption">
            No active review cycle for this team yet — start one from the department dashboard
            before adding KPIs.
          </div>
        )}
      </FrostCard>
    </div>
  );
}
