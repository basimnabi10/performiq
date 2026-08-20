import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { FrostCard } from "@/components/ui/FrostCard";
import { StatCard } from "@/components/ui/StatCard";
import { KpiPerformanceChart } from "@/components/analytics/KpiPerformanceChart";
import { MemberKpiHeatmap } from "@/components/analytics/MemberKpiHeatmap";

export default async function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  const actor = await getCurrentMember();
  if (actor.authRole === "ic") redirect("/my-dashboard");

  const { team: rawTeam } = await searchParams;
  const teamParam = Array.isArray(rawTeam) ? rawTeam[0] : rawTeam;

  const allowedTeams = await prisma.team.findMany({
    where:
      actor.authRole === "admin"
        ? { orgId: actor.orgId }
        : actor.authRole === "hod"
          ? { departmentId: actor.departmentId ?? "" }
          : { id: actor.teamId ?? "" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const selectedTeam = allowedTeams.find((t) => t.id === teamParam);
  const scopeTeamIds =
    actor.authRole === "manager"
      ? allowedTeams.map((t) => t.id)
      : selectedTeam
        ? [selectedTeam.id]
        : allowedTeams.map((t) => t.id);

  const cycleScopeWhere =
    actor.authRole === "admin"
      ? { orgId: actor.orgId }
      : { orgId: actor.orgId, departmentId: actor.departmentId };

  const cycle =
    (await prisma.reviewCycle.findFirst({
      where: { ...cycleScopeWhere, status: "in_progress" },
      orderBy: { startDate: "desc" },
    })) ??
    (await prisma.reviewCycle.findFirst({
      where: cycleScopeWhere,
      orderBy: { startDate: "desc" },
    }));

  if (!cycle || scopeTeamIds.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="piq-h1">Analytics</div>
        <FrostCard>
          <div className="piq-caption">
            No review cycle exists yet for this scope — start one from the department dashboard,
            then add KPIs and complete a few reviews to see analytics here.
          </div>
        </FrostCard>
      </div>
    );
  }

  const members = await prisma.member.findMany({
    where: { teamId: { in: scopeTeamIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const memberIds = members.map((m) => m.id);

  const kpiTeams = await prisma.kpiTeam.findMany({
    where: { teamId: { in: scopeTeamIds }, kpi: { cycleId: cycle.id } },
    include: { kpi: true },
  });
  const kpiById = new Map(kpiTeams.map((kt) => [kt.kpiId, kt]));
  const kpis = Array.from(kpiById.values());

  const scores = memberIds.length
    ? await prisma.memberKpiScore.findMany({
        where: { cycleId: cycle.id, memberId: { in: memberIds } },
      })
    : [];

  const memberAverages = new Map<string, number>();
  for (const memberId of memberIds) {
    const memberScores = scores.filter((s) => s.memberId === memberId);
    if (memberScores.length > 0) {
      memberAverages.set(
        memberId,
        memberScores.reduce((s, r) => s + Number(r.score), 0) / memberScores.length,
      );
    }
  }

  const kpiAverages = new Map<string, number>();
  for (const kt of kpis) {
    const kpiScores = scores.filter((s) => s.kpiId === kt.kpiId);
    if (kpiScores.length > 0) {
      kpiAverages.set(
        kt.kpiId,
        kpiScores.reduce((s, r) => s + Number(r.score), 0) / kpiScores.length,
      );
    }
  }

  const scoredAverages = Array.from(memberAverages.values());
  const overallScore = scoredAverages.length
    ? scoredAverages.reduce((s, v) => s + v, 0) / scoredAverages.length
    : null;
  const kpisOnTarget = kpis.filter((kt) => {
    const avg = kpiAverages.get(kt.kpiId);
    if (avg == null || kt.kpi.targetNumeric == null) return false;
    return kt.kpi.direction === "lower_is_better"
      ? avg <= Number(kt.kpi.targetNumeric)
      : avg >= Number(kt.kpi.targetNumeric);
  }).length;
  const belowFour = scoredAverages.filter((v) => v < 4).length;

  const buckets = [
    { label: "Exceptional", range: "4.5–5.0", min: 4.5, count: 0 },
    { label: "Strong", range: "4.0–4.4", min: 4.0, count: 0 },
    { label: "Developing", range: "3.5–3.9", min: 3.5, count: 0 },
    { label: "Needs support", range: "< 3.5", min: 0, count: 0 },
  ];
  for (const avg of scoredAverages) {
    const bucket = buckets.find((b) => avg >= b.min);
    if (bucket) bucket.count += 1;
  }

  const scoredMembers = members.filter((m) => memberAverages.has(m.id));
  const heatmapCells = scoredMembers.map((m) => kpis.map((kt) => {
    const cell = scores.find((s) => s.memberId === m.id && s.kpiId === kt.kpiId);
    return cell ? Number(cell.score) : null;
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="piq-h1">Analytics</div>
          <div className="piq-caption">{cycle.label}</div>
        </div>
        {actor.authRole !== "manager" ? (
          <div style={{ display: "inline-flex", gap: 4 }}>
            <Link
              href="/analytics"
              style={{
                fontSize: 13,
                padding: "8px 14px",
                borderRadius: 10,
                textDecoration: "none",
                background: !selectedTeam ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "rgba(255,255,255,.4)",
                color: !selectedTeam ? "#fff" : "#596392",
              }}
            >
              All teams
            </Link>
            {allowedTeams.map((t) => (
              <Link
                key={t.id}
                href={`/analytics?team=${t.id}`}
                style={{
                  fontSize: 13,
                  padding: "8px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  background: selectedTeam?.id === t.id ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "rgba(255,255,255,.4)",
                  color: selectedTeam?.id === t.id ? "#fff" : "#596392",
                }}
              >
                {t.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
        <StatCard label="Scope score" value={overallScore != null ? overallScore.toFixed(1) : "—"} unit="/5" icon="ant-design:rise-outlined" />
        <StatCard label="KPIs on target" value={`${kpisOnTarget}/${kpis.length}`} icon="ant-design:aim-outlined" />
        <StatCard label="People below 4.0" value={belowFour} icon="ant-design:alert-outlined" />
        <StatCard label="Members scored" value={`${scoredMembers.length}/${members.length}`} icon="ant-design:team-outlined" />
      </div>

      <FrostCard>
        <div className="piq-h3" style={{ marginBottom: 12 }}>
          KPI performance vs target
        </div>
        <KpiPerformanceChart
          data={kpis
            .filter((kt) => kpiAverages.has(kt.kpiId))
            .map((kt) => ({
              name: kt.kpi.name,
              avgScore: Math.round((kpiAverages.get(kt.kpiId) ?? 0) * 100) / 100,
              targetNumeric: kt.kpi.targetNumeric ? Number(kt.kpi.targetNumeric) : 0,
            }))}
        />
      </FrostCard>

      <FrostCard>
        <div className="piq-h3" style={{ marginBottom: 12 }}>
          Score distribution
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          {buckets.map((b) => (
            <div key={b.label} style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,.35)" }}>
              <div className="piq-caption">{b.label}</div>
              <div style={{ fontSize: 24, fontWeight: 500 }}>{b.count}</div>
              <div className="piq-caption">{b.range}</div>
            </div>
          ))}
        </div>
      </FrostCard>

      <FrostCard>
        <div className="piq-h3" style={{ marginBottom: 12 }}>
          Member × KPI heatmap
        </div>
        <MemberKpiHeatmap
          data={{
            memberNames: scoredMembers.map((m) => m.name),
            kpiNames: kpis.map((kt) => kt.kpi.name),
            cells: heatmapCells,
          }}
        />
      </FrostCard>
    </div>
  );
}
