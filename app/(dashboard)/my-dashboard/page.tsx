import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { FrostCard } from "@/components/ui/FrostCard";
import { StatCard } from "@/components/ui/StatCard";

export default async function MyDashboardPage() {
  const member = await getCurrentMember();

  const [teammateCount, activeCycle] = await Promise.all([
    member.teamId
      ? prisma.member.count({ where: { teamId: member.teamId, id: { not: member.id } } })
      : Promise.resolve(0),
    prisma.reviewCycle.findFirst({
      where: { orgId: member.orgId, status: "in_progress" },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const firstName = member.name.split(" ")[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <FrostCard tone="ink" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="piq-display" style={{ color: "#fff" }}>
          Good to see you, {firstName}
        </div>
        <div className="piq-body" style={{ color: "#A8AFCB" }}>
          {activeCycle
            ? `${activeCycle.label} is in progress.`
            : "No review cycle is currently active."}{" "}
          You have {teammateCount} teammate{teammateCount === 1 ? "" : "s"}.
        </div>
      </FrostCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
        <StatCard label="KPIs on target" value="—" icon="ant-design:aim-outlined" />
        <StatCard label="Reviews to give" value="—" icon="ant-design:file-done-outlined" />
        <StatCard label="Learning progress" value="—" icon="ant-design:read-outlined" />
      </div>

      <FrostCard>
        <div className="piq-caption">
          KPI scores, review assignments, mood check-in, and learning widgets light up once
          KPIs, reviews, and courses are wired up in the next build phases.
        </div>
      </FrostCard>
    </div>
  );
}
