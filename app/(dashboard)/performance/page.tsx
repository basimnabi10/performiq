import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { cycleScopeWhere } from "@/lib/cycles";
import { quarterLabel } from "@/lib/quarters";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MonthPicker, type MonthOption } from "@/components/cycles/MonthPicker";
import { KpiPerformanceMatrix } from "@/components/performance/KpiPerformanceMatrix";
import { TopPerformers } from "@/components/performance/TopPerformers";

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

/**
 * Everything at once: every person against every KPI for one month, and the
 * ranking those scores add up to.
 *
 * The dashboard answers "how is the department doing"; this answers "who is
 * doing well at what", which otherwise means opening each member in turn and
 * holding the comparison in your head.
 *
 * Ranking uses each team's KPI WEIGHTS rather than a flat average, so someone
 * strong on the KPIs their team weights heavily outranks someone with an even
 * spread -- otherwise this table would disagree with the weighted score shown
 * on the member's own review.
 */
export default async function PerformancePage({ searchParams }: PageProps<"/performance">) {
  const actor = await getCurrentMember();
  if (actor.authRole === "hr") redirect("/hr");
  if (actor.authRole === "ic") redirect("/my-dashboard");

  const { month: rawMonth, team: rawTeam } = await searchParams;
  const monthParam = Array.isArray(rawMonth) ? rawMonth[0] : rawMonth;
  const teamParam = Array.isArray(rawTeam) ? rawTeam[0] : rawTeam;

  const cycles = await prisma.reviewCycle.findMany({
    where: cycleScopeWhere(actor),
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  if (cycles.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="piq-h1">Performance by KPI</div>
        <EmptyState
          icon="ant-design:bar-chart-outlined"
          title="No review months yet"
          body="Months open automatically on the 1st. Once one is open and reviews are submitted, every score lands here."
        />
      </div>
    );
  }

  const keyOf = (c: { year: number; month: number }) => `${c.year}-${String(c.month).padStart(2, "0")}`;

  const monthOptions: MonthOption[] = [];
  for (const c of [...cycles].reverse()) {
    const key = keyOf(c);
    const existing = monthOptions.find((m) => m.key === key);
    if (!existing) {
      monthOptions.push({
        key,
        label: c.label,
        status: c.status,
        daysLeft: c.status === "in_progress" ? daysUntil(c.endDate) : undefined,
      });
    } else if (c.status === "in_progress" && existing.status !== "in_progress") {
      existing.status = "in_progress";
      existing.daysLeft = daysUntil(c.endDate);
    }
  }

  const runningCycle = cycles.find((c) => c.status === "in_progress");
  const selectedMonthKey =
    (monthParam && monthOptions.some((m) => m.key === monthParam) ? monthParam : undefined) ??
    (runningCycle ? keyOf(runningCycle) : undefined) ??
    monthOptions[0].key;

  const monthCycles = cycles.filter((c) => keyOf(c) === selectedMonthKey);
  const monthCycleIds = monthCycles.map((c) => c.id);
  const quarterIds = [...new Set(monthCycles.map((c) => c.quarterId).filter((q): q is string => q != null))];
  const selectedLabel = monthCycles[0]?.label ?? selectedMonthKey;

  const teams = await prisma.team.findMany({
    where: actor.authRole === "admin" ? { orgId: actor.orgId } : { departmentId: actor.departmentId ?? "" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const selectedTeam = teams.find((t) => t.id === teamParam);
  const scopeTeamIds = selectedTeam ? [selectedTeam.id] : teams.map((t) => t.id);

  const [members, kpiTeams, scores, quarter] = await Promise.all([
    prisma.member.findMany({
      where: { teamId: { in: scopeTeamIds } },
      select: { id: true, name: true, jobTitle: true, avatarUrl: true, teamId: true, team: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.kpiTeam.findMany({
      where: { teamId: { in: scopeTeamIds }, kpi: { quarterId: { in: quarterIds } } },
      include: { kpi: { select: { id: true, name: true, unit: true } } },
    }),
    prisma.memberKpiScore.findMany({
      where: { cycleId: { in: monthCycleIds } },
      select: { memberId: true, kpiId: true, score: true },
    }),
    quarterIds.length
      ? prisma.quarter.findUnique({ where: { id: quarterIds[0] }, select: { year: true, index: true } })
      : Promise.resolve(null),
  ]);

  const kpiColumns = [...new Map(kpiTeams.map((kt) => [kt.kpiId, kt.kpi])).values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // weightPct belongs to a team, not to a KPI, so it is looked up per member.
  const weightFor = (teamId: string | null, kpiId: string) =>
    teamId ? (kpiTeams.find((kt) => kt.teamId === teamId && kt.kpiId === kpiId)?.weightPct ?? 0) : 0;

  const rows = members.map((m) => {
    const mine = scores.filter((s) => s.memberId === m.id);
    const byKpi = new Map(mine.map((s) => [s.kpiId, Number(s.score)]));

    let weightedSum = 0;
    let weightTotal = 0;
    for (const [kpiId, score] of byKpi) {
      const w = weightFor(m.teamId, kpiId);
      if (w > 0) {
        weightedSum += score * w;
        weightTotal += w;
      }
    }
    const plain = [...byKpi.values()];
    const overall =
      weightTotal > 0
        ? weightedSum / weightTotal
        : plain.length
          ? plain.reduce((s, v) => s + v, 0) / plain.length
          : null;

    return {
      memberId: m.id,
      name: m.name,
      jobTitle: m.jobTitle,
      avatarUrl: m.avatarUrl,
      teamName: m.team?.name ?? null,
      scores: Object.fromEntries(byKpi) as Record<string, number>,
      // How much of this person's KPI set has been scored: an average over
      // one KPI should not be read like an average over six.
      scoredCount: byKpi.size,
      kpiCount: kpiColumns.filter((k) => weightFor(m.teamId, k.id) > 0).length,
      overall,
    };
  });

  // Ties break on how many KPIs the score covers: 5.00 across six KPIs is a
  // stronger result than 5.00 across one, and without this the order between
  // them is whatever the database returned first.
  const ranked = rows
    .filter((r) => r.overall != null)
    .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0) || b.scoredCount - a.scoredCount);
  const orgAverage = ranked.length ? ranked.reduce((s, r) => s + (r.overall ?? 0), 0) / ranked.length : null;
  const quarterName = quarter ? quarterLabel(quarter.year, quarter.index) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="piq-h1">Performance by KPI</div>
          <div className="piq-body" style={{ marginTop: 4 }}>
            Every person against every KPI for {selectedLabel}
            {quarterName ? ` · KPIs set for ${quarterName}` : ""}.
          </div>
        </div>
        <MonthPicker months={monthOptions} selectedKey={selectedMonthKey} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/performance?month=${selectedMonthKey}`} style={{ textDecoration: "none" }}>
          <span className={selectedTeam ? "piq-chip" : "piq-chip is-active"}>All teams</span>
        </Link>
        {teams.map((t) => (
          <Link
            key={t.id}
            href={`/performance?team=${t.id}&month=${selectedMonthKey}`}
            style={{ textDecoration: "none" }}
          >
            <span className={selectedTeam?.id === t.id ? "piq-chip is-active" : "piq-chip"}>{t.name}</span>
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16 }}>
        <StatCard label="People scored" value={`${ranked.length}/${rows.length}`} />
        <StatCard label="KPIs in play" value={kpiColumns.length} />
        <StatCard label="Average score" value={orgAverage != null ? orgAverage.toFixed(1) : "—"} unit="/5" />
        <StatCard label="Top performer" value={ranked[0]?.name ?? "—"} />
      </div>

      {ranked.length === 0 ? (
        <EmptyState
          icon="ant-design:hourglass-outlined"
          title={`No scores recorded for ${selectedLabel} yet`}
          body="Scores appear here as manager reviews are completed. Pick another month above to see a period that has already been reviewed."
        />
      ) : (
        <>
          <TopPerformers rows={ranked.slice(0, 3)} />
          <KpiPerformanceMatrix kpis={kpiColumns} rows={rows} />
        </>
      )}
    </div>
  );
}
