import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { FrostCard } from "@/components/ui/FrostCard";
import { StatCard } from "@/components/ui/StatCard";
import { StartCycleModal } from "@/components/cycles/StartCycleModal";

export default async function HodDashboardPage() {
  const member = await getCurrentMember();
  if (member.authRole !== "admin" && member.authRole !== "hod") {
    redirect("/my-dashboard");
  }

  const scopeWhere =
    member.authRole === "admin"
      ? { orgId: member.orgId }
      : { orgId: member.orgId, departmentId: member.departmentId };

  const [teams, memberCount, invitedCount, activeCycle] = await Promise.all([
    prisma.team.findMany({
      where: member.authRole === "admin" ? { orgId: member.orgId } : { departmentId: member.departmentId ?? "" },
      include: { _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.member.count({ where: scopeWhere }),
    prisma.member.count({ where: { ...scopeWhere, status: "invited" } }),
    prisma.reviewCycle.findFirst({
      where:
        member.authRole === "admin"
          ? { orgId: member.orgId, status: "in_progress" }
          : { orgId: member.orgId, status: "in_progress", departmentId: member.departmentId },
      orderBy: { startDate: "desc" },
    }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <FrostCard tone="ink" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div className="piq-display" style={{ color: "#fff" }}>
            {member.authRole === "admin" ? "Organization overview" : "Department overview"}
          </div>
          <div className="piq-body" style={{ color: "#A8AFCB", marginTop: 4 }}>
            {activeCycle ? `${activeCycle.label} is in progress.` : "No review cycle is currently active."}
          </div>
        </div>
        {!activeCycle ? <StartCycleModal departmentId={member.authRole === "hod" ? member.departmentId ?? undefined : undefined} /> : null}
      </FrostCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
        <StatCard label="Total members" value={memberCount} icon="ant-design:team-outlined" />
        <StatCard label="Pending invitations" value={invitedCount} icon="ant-design:mail-outlined" />
        <StatCard label="Teams" value={teams.length} icon="ant-design:apartment-outlined" />
        <StatCard label="Active review cycle" value={activeCycle ? "In progress" : "None"} icon="ant-design:sync-outlined" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 18 }}>
        {teams.map((team) => (
          <FrostCard key={team.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="piq-h3">{team.name}</div>
            <div className="piq-caption">{team._count.members} members</div>
          </FrostCard>
        ))}
      </div>

      <FrostCard>
        <div className="piq-caption">
          KPI performance, pending actions, team mood, and lesson-request approvals light up
          once learning and analytics are wired up in the next build phases.
        </div>
      </FrostCard>
    </div>
  );
}
