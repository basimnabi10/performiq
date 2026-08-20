import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { FrostCard } from "@/components/ui/FrostCard";
import { MembersTable } from "@/components/members/MembersTable";
import { InviteMemberModal } from "@/components/members/InviteMemberModal";

export default async function TeamDetailPage({ params, searchParams }: PageProps<"/teams/[id]">) {
  const { id } = await params;
  const { tab } = await searchParams;
  const actor = await getCurrentMember();

  const team = await prisma.team.findFirst({
    where: { id, orgId: actor.orgId },
    include: {
      lead: { select: { name: true } },
      members: { orderBy: { name: "asc" }, include: { team: { select: { name: true } } } },
      kpiTeams: { include: { kpi: true } },
    },
  });
  if (!team) notFound();

  const activeTab = tab === "kpis" ? "kpis" : "members";
  const canManage =
    actor.authRole === "admin" ||
    (actor.authRole === "hod" && actor.departmentId === team.departmentId) ||
    (actor.authRole === "manager" && actor.teamId === team.id);

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
        ) : (
          <div className="piq-caption">
            KPI management for this team lands in the next build phase (weighted scoring +
            create-KPI flow).
          </div>
        )}
      </FrostCard>
    </div>
  );
}
