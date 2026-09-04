import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/StatCard";
import { TeamSelect } from "@/components/analytics/TeamSelect";
import { AnalyticsTrendChart } from "@/components/analytics/AnalyticsTrendChart";
import { ScoreDistributionPanel } from "@/components/analytics/ScoreDistributionPanel";
import { KpiPerformanceTable } from "@/components/analytics/KpiPerformanceTable";
import { BiggestMoversPanel } from "@/components/analytics/BiggestMoversPanel";
import { LeadersByKpiPanel } from "@/components/analytics/LeadersByKpiPanel";
import { MemberKpiHeatmap } from "@/components/analytics/MemberKpiHeatmap";

const BUCKET_DEFS = [
  { label: "Exceptional · 4.5–5.0", min: 4.5, max: 5.01, color: "#273FF9" },
  { label: "Strong · 4.0–4.4", min: 4, max: 4.5, color: "rgba(58,99,250,.6)" },
  { label: "Developing · 3.5–3.9", min: 3.5, max: 4, color: "rgba(58,99,250,.32)" },
  { label: "Needs support · below 3.5", min: 0, max: 3.5, color: "rgba(89,99,146,.45)" },
] as const;

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

  const cycleScopeWhere = actor.authRole === "admin" ? { orgId: actor.orgId } : { orgId: actor.orgId, departmentId: actor.departmentId };

  const [cycle, cycleHistory] = await Promise.all([
    prisma.reviewCycle.findFirst({ where: { ...cycleScopeWhere, status: "in_progress" }, orderBy: { startDate: "desc" } }),
    prisma.reviewCycle.findMany({ where: cycleScopeWhere, orderBy: { startDate: "asc" } }),
  ]);

  if (!cycle || scopeTeamIds.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="piq-h1">Analytics</div>
        <div className="piq-caption">
          No review cycle exists yet for this scope — start one from the department dashboard, then add KPIs and
          complete a few reviews to see analytics here.
        </div>
      </div>
    );
  }

  const members = await prisma.member.findMany({
    where: { teamId: { in: scopeTeamIds } },
    select: { id: true, name: true, jobTitle: true, team: { select: { name: true } } },
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
    ? await prisma.memberKpiScore.findMany({ where: { cycleId: cycle.id, memberId: { in: memberIds } } })
    : [];

  const memberAverages = new Map<string, number>();
  for (const memberId of memberIds) {
    const memberScores = scores.filter((s) => s.memberId === memberId);
    if (memberScores.length > 0) {
      memberAverages.set(memberId, memberScores.reduce((s, r) => s + Number(r.score), 0) / memberScores.length);
    }
  }

  const kpiAverages = new Map<string, number>();
  for (const kt of kpis) {
    const kpiScores = scores.filter((s) => s.kpiId === kt.kpiId);
    if (kpiScores.length > 0) {
      kpiAverages.set(kt.kpiId, kpiScores.reduce((s, r) => s + Number(r.score), 0) / kpiScores.length);
    }
  }

  const scoredAverages = Array.from(memberAverages.values());
  const overallScore = scoredAverages.length ? scoredAverages.reduce((s, v) => s + v, 0) / scoredAverages.length : null;
  const kpisOnTarget = kpis.filter((kt) => kt.kpi.status === "on").length;
  const belowFour = scoredAverages.filter((v) => v < 4).length;
  const scoredKpis = kpis.filter((kt) => kpiAverages.has(kt.kpiId));
  const kpiWeightedAvg = scoredKpis.length
    ? scoredKpis.reduce((s, kt) => s + (kpiAverages.get(kt.kpiId) ?? 0) * kt.weightPct, 0) /
      scoredKpis.reduce((s, kt) => s + kt.weightPct, 0)
    : null;

  // ---- real per-cycle trend (this scope's members, across all cycles — no fabricated points) ----
  const cyclePoints: { label: string; value: number; year: number }[] = [];
  for (const c of cycleHistory) {
    const cycleScores = await prisma.memberKpiScore.findMany({
      where: { cycleId: c.id, memberId: { in: memberIds } },
      select: { score: true },
    });
    if (cycleScores.length) {
      cyclePoints.push({
        label: c.label,
        value: cycleScores.reduce((s, r) => s + Number(r.score), 0) / cycleScores.length,
        year: c.startDate.getFullYear(),
      });
    }
  }
  const trendPoints = cyclePoints.map(({ label, value }) => ({ label, value }));
  const prevCyclePoint = trendPoints.length >= 2 ? trendPoints[trendPoints.length - 2] : null;
  const currentPoint = trendPoints[trendPoints.length - 1] ?? null;
  const scoreDelta = prevCyclePoint && currentPoint ? currentPoint.value - prevCyclePoint.value : null;

  // Annual is a real aggregation of the same per-cycle data (average of the
  // cycles that fall in each year) — Weekly/Monthly have no real source yet
  // (cycles are the only time-series we track), so they show an honest
  // empty state instead of fabricated points.
  const annualMap = new Map<number, number[]>();
  for (const p of cyclePoints) {
    if (!annualMap.has(p.year)) annualMap.set(p.year, []);
    annualMap.get(p.year)!.push(p.value);
  }
  const annualPoints = Array.from(annualMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, values]) => ({ label: String(year), value: values.reduce((s, v) => s + v, 0) / values.length }));

  const trendPeriods: Record<"weekly" | "monthly" | "quarterly" | "annual", { points: { label: string; value: number }[]; unavailableNote?: string }> = {
    weekly: { points: [], unavailableNote: "Weekly-level history isn't tracked yet — review cycles are the finest granularity available." },
    monthly: { points: [], unavailableNote: "Monthly-level history isn't tracked yet — review cycles are the finest granularity available." },
    quarterly: { points: trendPoints },
    annual: { points: annualPoints, unavailableNote: "Not enough closed cycles yet for a yearly trend." },
  };
  const avgTarget = kpis.length
    ? kpis.reduce((s, kt) => s + (kt.kpi.targetNumeric != null ? Number(kt.kpi.targetNumeric) : 0), 0) /
      kpis.filter((kt) => kt.kpi.targetNumeric != null).length
    : null;

  // ---- score distribution ----
  const scoredMembers = members.filter((m) => memberAverages.has(m.id));
  const buckets = BUCKET_DEFS.map((b) => {
    const inBand = scoredMembers.filter((m) => {
      const v = memberAverages.get(m.id) ?? 0;
      return v >= b.min && v < b.max;
    });
    const pct = scoredMembers.length ? Math.round((inBand.length / scoredMembers.length) * 100) : 0;
    const names = inBand.length
      ? inBand
          .slice(0, 4)
          .map((m) => m.name.split(" ")[0])
          .join(", ") + (inBand.length > 4 ? ` +${inBand.length - 4}` : "")
      : "Nobody in this band";
    return { label: b.label, color: b.color, count: inBand.length, pct, names };
  });
  const unscoredCount = members.length - scoredMembers.length;

  // ---- KPI performance table ----
  const kpiRows = kpis.map((kt) => {
    const avg = kpiAverages.get(kt.kpiId) ?? null;
    const contribution = avg != null ? Math.round(((avg / 5) * kt.weightPct) * 10) / 10 : null;
    return {
      kpiId: kt.kpiId,
      icon: "ant-design:aim-outlined",
      name: kt.kpi.name,
      statusLabel: kt.kpi.status === "below" ? "Below target" : kt.kpi.status === "new" ? "New" : "On target",
      statusTone: kt.kpi.status,
      target: kt.kpi.targetValue,
      current: avg != null ? avg.toFixed(1) : "—",
      avgScore: avg,
      weight: kt.weightPct,
      contribution,
    };
  });

  // ---- biggest movers (real delta vs previous cycle) ----
  let movers: { memberId: string; name: string; roleTeam: string; score: number; delta: number }[] = [];
  if (prevCyclePoint) {
    const prevCycle = cycleHistory[cycleHistory.findIndex((c) => c.label === prevCyclePoint.label)];
    const prevScores = prevCycle
      ? await prisma.memberKpiScore.findMany({ where: { cycleId: prevCycle.id, memberId: { in: memberIds } } })
      : [];
    const prevAverages = new Map<string, number>();
    for (const memberId of memberIds) {
      const s = prevScores.filter((r) => r.memberId === memberId);
      if (s.length) prevAverages.set(memberId, s.reduce((a, r) => a + Number(r.score), 0) / s.length);
    }
    movers = members
      .filter((m) => memberAverages.has(m.id) && prevAverages.has(m.id))
      .map((m) => {
        const current = memberAverages.get(m.id)!;
        const prev = prevAverages.get(m.id)!;
        return {
          memberId: m.id,
          name: m.name,
          roleTeam: `${m.jobTitle ?? "Member"} · ${m.team?.name ?? "Unassigned"}`,
          score: current,
          delta: Math.round((current - prev) * 10) / 10,
        };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);
  }

  // ---- leaders by KPI (precomputed per KPI for client-side switching) ----
  const leaderboards: Record<string, { memberId: string; name: string; roleTeam: string; score: number }[]> = {};
  for (const kt of kpis) {
    const kpiScores = scores.filter((s) => s.kpiId === kt.kpiId);
    leaderboards[kt.kpiId] = kpiScores
      .map((s) => {
        const m = members.find((mm) => mm.id === s.memberId);
        return m
          ? { memberId: m.id, name: m.name, roleTeam: `${m.jobTitle ?? "Member"} · ${m.team?.name ?? "Unassigned"}`, score: Number(s.score) }
          : null;
      })
      .filter((x): x is { memberId: string; name: string; roleTeam: string; score: number } => x != null)
      .sort((a, b) => b.score - a.score);
  }

  // ---- heatmap ----
  const heatmapKpis = kpis.slice(0, 8);
  const heatmapCells = scoredMembers.map((m) =>
    heatmapKpis.map((kt) => {
      const cell = scores.find((s) => s.memberId === m.id && s.kpiId === kt.kpiId);
      return cell ? Number(cell.score) : null;
    }),
  );

  const teamLabel = selectedTeam ? selectedTeam.name : actor.authRole === "admin" ? "Organization" : "Department";
  const scopeWord = selectedTeam ? "team" : "department";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, color: "#767FA5", fontWeight: 500 }}>{actor.authRole === "admin" ? "Organization" : "Department"}</div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", marginTop: 2 }}>
            {selectedTeam ? `${selectedTeam.name} analytics` : "Analytics"}
          </div>
          <div style={{ fontSize: 14, color: "#596392", marginTop: 3 }}>
            {teamLabel} · {scoredMembers.length} scored{unscoredCount ? ` · ${unscoredCount} not yet reviewed` : ""} · {kpis.length} KPIs · scored
            out of 5
          </div>
        </div>
        {actor.authRole !== "manager" ? (
          <TeamSelect teams={allowedTeams} selectedId={selectedTeam?.id ?? "all"} basePath="/analytics" />
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16 }}>
        <StatCard
          label={selectedTeam ? "Team score" : "Department score"}
          value={overallScore != null ? overallScore.toFixed(1) : "—"}
          unit="/ 5"
          icon="ant-design:trophy-outlined"
          trend={scoreDelta != null ? Math.abs(scoreDelta).toFixed(1) : undefined}
          trendDir={scoreDelta != null && scoreDelta < 0 ? "down" : "up"}
        />
        <StatCard label="KPI weighted average" value={kpiWeightedAvg != null ? kpiWeightedAvg.toFixed(1) : "—"} unit="/ 5" icon="ant-design:aim-outlined" />
        <StatCard label="KPIs on target" value={`${kpisOnTarget} of ${kpis.length}`} icon="ant-design:check-circle-outlined" />
        <StatCard label="People below 4.0" value={String(belowFour)} icon="ant-design:warning-outlined" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 16 }}>
        <AnalyticsTrendChart title={`${selectedTeam ? "Team" : "Department"} performance trend`} periods={trendPeriods} target={avgTarget} />
        <ScoreDistributionPanel
          buckets={buckets}
          headcount={scoredMembers.length}
          unscoredNote={
            unscoredCount
              ? `${unscoredCount} ${unscoredCount === 1 ? "person has" : "people have"} not been reviewed yet and are excluded`
              : "Everyone in scope has been scored"
          }
        />
      </div>

      <KpiPerformanceTable rows={kpiRows} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 16 }}>
        <BiggestMoversPanel movers={movers} />
        <LeadersByKpiPanel kpiOptions={kpis.map((kt) => ({ kpiId: kt.kpiId, name: kt.kpi.name }))} leaderboards={leaderboards} />
      </div>

      <MemberKpiHeatmap
        scopeWord={scopeWord}
        data={{
          memberNames: scoredMembers.map((m) => m.name),
          kpiNames: heatmapKpis.map((kt) => kt.kpi.name),
          cells: heatmapCells,
        }}
      />
    </div>
  );
}
