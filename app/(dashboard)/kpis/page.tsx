import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { findActiveCycle, findActiveQuarter } from "@/lib/cycles";
import { quarterLabel } from "@/lib/quarters";
import { ScopePicker } from "@/components/dashboard/hod/ScopePicker";
import { ImportKpisButton } from "@/components/kpis/ImportKpisButton";
import { KpiDrawerHost } from "@/components/kpis/KpiDrawerHost";
import { KpiLibraryDrawer } from "@/components/kpis/KpiLibraryDrawer";
import { CreateKpiWizard } from "@/components/kpis/CreateKpiWizard";
import { METRIC_ICON } from "@/components/kpis/TeamKpiCreateModal";
import { KpiCurrentCell } from "@/components/kpis/KpiCurrentCell";
import { EmptyState } from "@/components/ui/EmptyState";
import { kpiMeasurementStatus } from "@/lib/kpi-status";

export default async function KpisPage({ searchParams }: PageProps<"/kpis">) {
  const actor = await getCurrentMember();
  if (actor.authRole !== "admin" && actor.authRole !== "hod") {
    redirect("/my-dashboard");
  }

  const { team: rawTeam } = await searchParams;
  const teamParam = Array.isArray(rawTeam) ? rawTeam[0] : rawTeam;

  const isOrgWide = actor.authRole === "admin";
  const departmentName = isOrgWide
    ? "Organization"
    : (await prisma.department.findUnique({ where: { id: actor.departmentId ?? "" }, select: { name: true } }))?.name ?? "Department";

  const teams = await prisma.team.findMany({
    where: isOrgWide ? { orgId: actor.orgId } : { departmentId: actor.departmentId ?? "" },
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });

  const activeCycle = await findActiveCycle(actor);
  // KPIs are owned by the quarter: one set of targets covers its three months.
  const activeQuarter = await findActiveQuarter(actor);

  if (teams.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="piq-h1">KPIs</div>
        <div className="piq-caption">No teams in scope yet.</div>
      </div>
    );
  }

  const selectedTeam = teams.find((t) => t.id === teamParam) ?? teams[0];

  // Shared across the org, so every team picks from the same list.
  const kpiCategories = await prisma.kpiCategory.findMany({
    where: { orgId: actor.orgId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // The org library: only KPIs someone deliberately shared. Includes which
  // teams use each one and at what weight, since that is the useful context
  // when deciding whether to adopt it.
  const libraryKpis = activeQuarter
    ? (
        await prisma.kpi.findMany({
          where: { orgId: actor.orgId, quarterId: activeQuarter.id, shareable: true },
          orderBy: { name: "asc" },
          include: {
            category: { select: { name: true } },
            kpiTeams: { include: { team: { select: { id: true, name: true } } } },
          },
        })
      ).map((k) => ({
        kpiId: k.id,
        name: k.name,
        description: k.description,
        categoryName: k.category?.name ?? null,
        target: k.targetValue,
        unit: k.unit,
        usedBy: k.kpiTeams.map((kt) => ({ teamName: kt.team.name, weightPct: kt.weightPct })),
        alreadyOnThisTeam: false,
      }))
    : [];

  // Every weight in the open quarter, so the wizard rebalances against the
  // real framework rather than only what this page happens to show.
  const allQuarterWeights = activeQuarter
    ? (
        await prisma.kpiTeam.findMany({
          where: { kpi: { quarterId: activeQuarter.id } },
          include: { kpi: { select: { id: true, name: true } } },
        })
      ).map((kt) => ({
        kpiTeamId: kt.id,
        kpiId: kt.kpiId,
        teamId: kt.teamId,
        kpiName: kt.kpi.name,
        weightPct: kt.weightPct,
      }))
    : [];

  const kpiTeams = activeQuarter
    ? await prisma.kpiTeam.findMany({
        where: { teamId: selectedTeam.id, kpi: { quarterId: activeQuarter.id } },
        include: {
          kpi: {
            include: {
              category: { select: { name: true } },
              owner: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const teamMembers = await prisma.member.findMany({ where: { teamId: selectedTeam.id }, select: { id: true } });
  const memberIds = teamMembers.map((m) => m.id);

  const memberKpiScores = activeCycle
    ? await prisma.memberKpiScore.findMany({
        where: { cycleId: activeCycle.id, memberId: { in: memberIds }, kpiId: { in: kpiTeams.map((kt) => kt.kpiId) } },
      })
    : [];

  const teamMemberRecords = await prisma.member.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, name: true },
  });
  const teamMemberNames = new Map(teamMemberRecords.map((m) => [m.id, m.name]));

  const kpiRows = kpiTeams.map((kt) => {
    const scores = memberKpiScores.filter((s) => s.kpiId === kt.kpiId);
    const avgScore = scores.length ? scores.reduce((s, r) => s + Number(r.score), 0) / scores.length : null;
    return {
      kpiTeamId: kt.id,
      kpiId: kt.kpiId,
      name: kt.kpi.name,
      icon: METRIC_ICON[kt.kpi.metricType as keyof typeof METRIC_ICON] ?? "ant-design:aim-outlined",
      quantifier:
        kt.kpi.description ||
        `Quantifier: ${kt.kpi.metricType}, ${kt.kpi.direction === "lower_is_better" ? "lower" : "higher"} is better`,
      target: kt.kpi.targetValue,
      unit: kt.kpi.unit ?? kt.kpi.metricType,
      weightPct: kt.weightPct,
      avgScore,
      currentValue: kt.kpi.currentValue,
      currentNumeric: kt.kpi.currentNumeric != null ? String(kt.kpi.currentNumeric) : null,
      // Derived from the recorded measurement vs the target (same unit), not
      // from Kpi.status, which is only a creation-time default and never moves.
      measurementStatus: kpiMeasurementStatus(kt.kpi.currentNumeric, kt.kpi),
      hasTarget: kt.kpi.targetNumeric != null,
      // Everything the side drawer shows, assembled here so opening it costs
      // no extra request.
      detail: {
        kpiId: kt.kpiId,
        name: kt.kpi.name,
        description: kt.kpi.description,
        rubric: kt.kpi.rubric,
        categoryName: kt.kpi.category?.name ?? null,
        lifecycle: kt.kpi.lifecycle,
        shareable: kt.kpi.shareable,
        metricType: kt.kpi.metricType,
        direction: kt.kpi.direction,
        target: kt.kpi.targetValue,
        unit: kt.kpi.unit ?? kt.kpi.metricType,
        currentValue: kt.kpi.currentValue,
        weightPct: kt.weightPct,
        avgScore,
        ownerName: kt.kpi.owner?.name ?? null,
        scores: scores
          .map((sc) => ({
            memberId: sc.memberId,
            name: teamMemberNames.get(sc.memberId) ?? "Unknown",
            score: Number(sc.score),
          }))
          .sort((a, b) => b.score - a.score),
      },
    };
  });

  const scoredRows = kpiRows.filter((r) => r.avgScore != null);
  const weightedSum = scoredRows.reduce((s, r) => s + r.avgScore! * r.weightPct, 0);
  const weightOfScored = scoredRows.reduce((s, r) => s + r.weightPct, 0);
  const teamScore = weightOfScored ? weightedSum / weightOfScored : null;
  const totalWeight = kpiTeams.reduce((s, kt) => s + kt.weightPct, 0);
  const measuredRows = kpiRows.filter((r) => r.measurementStatus != null);
  const onTargetCount = measuredRows.filter((r) => r.measurementStatus === "on").length;
  const cadenceCounts = new Map<string, number>();
  for (const kt of kpiTeams) cadenceCounts.set(kt.kpi.cadence, (cadenceCounts.get(kt.kpi.cadence) ?? 0) + 1);
  const topCadence = Array.from(cadenceCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  const cadenceLabel = topCadence ? topCadence[0].toUpperCase() + topCadence.slice(1) : "—";

  const canManage = actor.authRole === "admin" || actor.authRole === "hod";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, color: "#767FA5", fontWeight: 500 }}>
            {departmentName} · {selectedTeam.name}
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", marginTop: 2 }}>KPIs</div>
          <div style={{ fontSize: 14, color: "#596392", marginTop: 3 }}>
            {kpiTeams.length} KPIs · scored on a 1–5 scale
            {activeQuarter ? ` · used in every ${quarterLabel(activeQuarter.year, activeQuarter.index)} review form` : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {teams.length > 1 ? (
            <ScopePicker
              selectedId={selectedTeam.id}
              basePath="/kpis"
              options={teams.map((t) => ({
                id: t.id,
                label: t.name,
                meta: `${t._count.members} members`,
                icon: "ant-design:team-outlined",
              }))}
            />
          ) : null}
          <Link
            href="/reviews"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 13,
              fontWeight: 500,
              color: "#273FF9",
              background: "rgba(255,255,255,.6)",
              border: "1px solid rgba(255,255,255,.75)",
              borderRadius: 12,
              padding: "11px 16px",
              textDecoration: "none",
            }}
          >
            <iconify-icon icon="ant-design:file-done-outlined" width="15" />
            Start review
          </Link>
          {canManage && activeQuarter ? (
            <KpiLibraryDrawer
              kpis={libraryKpis.map((k) => ({
                ...k,
                alreadyOnThisTeam: kpiRows.some((r) => r.detail.kpiId === k.kpiId),
              }))}
              teamId={selectedTeam.id}
              teamName={selectedTeam.name}
              remainingWeight={Math.max(0, 100 - totalWeight)}
            />
          ) : null}
          {canManage && activeQuarter ? (
            <ImportKpisButton
              quarterId={activeQuarter.id}
              teamId={selectedTeam.id}
              teamName={selectedTeam.name}
            />
          ) : null}
          {canManage && activeQuarter ? (
            <CreateKpiWizard
              quarterId={activeQuarter.id}
              teams={teams.map((t) => ({ id: t.id, name: t.name, memberCount: t._count?.members ?? 0 }))}
              categories={kpiCategories}
              existingWeights={allQuarterWeights}
              defaultTeamId={selectedTeam.id}
            />
          ) : null}
        </div>
      </div>

      {!activeQuarter ? (
        <EmptyState
          icon="ant-design:aim-outlined"
          title="No active quarter"
          body="KPIs are defined per quarter, and a quarter opens with its first month. Open this month from the dashboard, then add the metrics this team is measured on."
          actionHref="/hod-dashboard"
          actionLabel="Go to dashboard"
        />
      ) : (
        <>
          <div style={{ display: "flex", gap: 16 }}>
            <SummaryCard label="Team KPI score" value={teamScore != null ? teamScore.toFixed(1) : "—"} unit="/5" />
            <SummaryCard label="Total weight" value={`${totalWeight}%`} />
            <SummaryCard
              label="On / above target"
              value={measuredRows.length ? `${onTargetCount} of ${measuredRows.length}` : "—"}
            />
            <SummaryCard label="Cadence" value={cadenceLabel} />
          </div>

          {kpiRows.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 150px 150px 90px 92px",
                gap: 16,
                padding: "0 20px",
                fontSize: 11,
                fontWeight: 500,
                color: "#767FA5",
                letterSpacing: ".05em",
                textTransform: "uppercase",
              }}
            >
              <div>KPI &amp; quantifier</div>
              <div>Target</div>
              <div>Current</div>
              <div>Weight</div>
              <div style={{ textAlign: "right" }}>Score</div>
            </div>
          ) : null}

          <KpiDrawerHost details={Object.fromEntries(kpiRows.map((r) => [r.kpiTeamId, r.detail]))} canManage={canManage}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {kpiRows.length === 0 ? (
              <div
                style={{
                  background: "rgba(255,255,255,.20)",
                  border: "1px solid rgba(255,255,255,.40)",
                  WebkitBackdropFilter: "blur(35px)",
                  backdropFilter: "blur(35px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,.06)",
                  borderRadius: 20,
                  padding: 20,
                }}
              >
                <div className="piq-caption">No KPIs yet for this team&rsquo;s current quarter.</div>
              </div>
            ) : (
              kpiRows.map((row) => (
                <div
                  key={row.kpiTeamId}
                  data-kpi-id={row.kpiTeamId}
                  style={{
                    cursor: "pointer",
                    background: "rgba(255,255,255,.20)",
                    border: "1px solid rgba(255,255,255,.40)",
                    WebkitBackdropFilter: "blur(35px)",
                    backdropFilter: "blur(35px)",
                    boxShadow: "0 8px 24px rgba(0,0,0,.06)",
                    borderRadius: 20,
                    padding: 20,
                    display: "grid",
                    gridTemplateColumns: "1fr 150px 150px 90px 92px",
                    gap: 16,
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    <span
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 13,
                        background: "rgba(58,99,250,.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#273FF9",
                        flexShrink: 0,
                      }}
                    >
                      <iconify-icon icon={row.icon} width="21" />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "#181835" }}>{row.name}</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#767FA5",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.quantifier}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>{row.target}</div>
                    <div style={{ fontSize: 11, color: "#767FA5" }}>{row.unit}</div>
                  </div>
                  <KpiCurrentCell
                    kpiId={row.kpiId}
                    currentValue={row.currentValue}
                    currentNumeric={row.currentNumeric}
                    status={row.measurementStatus}
                    hasTarget={row.hasTarget}
                    canEdit={canManage}
                  />
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#454D7A", fontVariantNumeric: "tabular-nums" }}>{row.weightPct}%</div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 20, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>
                      {row.avgScore != null ? row.avgScore.toFixed(1) : "—"}
                    </span>
                    <span style={{ fontSize: 12, color: "#A8AFCB" }}>{row.avgScore != null ? "/5" : " pending"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          </KpiDrawerHost>

          <Link
            href="/reviews"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "15px 18px",
              background: "rgba(39,63,249,.07)",
              border: "1px solid rgba(39,63,249,.15)",
              borderRadius: 16,
              textDecoration: "none",
            }}
          >
            <iconify-icon icon="ant-design:file-done-outlined" width="18" style={{ color: "#273FF9", flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 13, color: "#454D7A", lineHeight: 1.5 }}>
              These KPIs appear as weighted 1–5 rating rows on every {selectedTeam.name} review form for all three months of this quarter. Each reviewer&rsquo;s
              scores roll up by weight into the member&rsquo;s overall performance score.
            </div>
            <iconify-icon icon="ant-design:arrow-right-outlined" width="16" style={{ color: "#273FF9", flexShrink: 0 }} />
          </Link>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 18,
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: 12, color: "#767FA5" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
        {value}
        {unit ? <span style={{ fontSize: 14, color: "#A8AFCB" }}>{unit}</span> : null}
      </div>
    </div>
  );
}
