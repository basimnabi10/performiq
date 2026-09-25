import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { findActiveCycle, findActiveQuarterForTeam } from "@/lib/cycles";
import { quarterLabel } from "@/lib/quarters";
import { ScopePicker } from "@/components/dashboard/hod/ScopePicker";
import { ImportKpisButton } from "@/components/kpis/ImportKpisButton";
import { KpiLibraryTable, type KpiLibraryRow } from "@/components/kpis/KpiLibraryTable";
import type { KpiDetail } from "@/components/kpis/KpiDetailDrawer";
import { KpiLibraryDrawer } from "@/components/kpis/KpiLibraryDrawer";
import { CreateKpiWizard } from "@/components/kpis/CreateKpiWizard";
import { EmptyState } from "@/components/ui/EmptyState";

const ALL_TEAMS = "all";

export default async function KpisPage({ searchParams }: PageProps<"/kpis">) {
  const actor = await getCurrentMember();
  if (actor.authRole === "hr") redirect("/hr");
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

  if (teams.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="piq-h1">KPIs</div>
        <div className="piq-caption">No teams in scope yet.</div>
      </div>
    );
  }

  // "View all" is not a team: it shows every team's KPIs at once, which
  // means there is no single quarter, weight budget or team to create
  // against. The controls that need one are disabled while it is on.
  const viewingAll = teamParam === ALL_TEAMS;
  const selectedTeam = viewingAll ? null : (teams.find((t) => t.id === teamParam) ?? teams[0]);

  // KPIs are owned by the quarter: one set of targets covers its three
  // months. Which quarter that is depends on the team being shown, not on who
  // is looking — an admin sees every department's quarter.
  const activeQuarter = selectedTeam ? await findActiveQuarterForTeam(actor.orgId, selectedTeam) : null;

  // Every quarter in view: one per department when showing all teams.
  const quartersInView = selectedTeam
    ? activeQuarter
      ? [activeQuarter]
      : []
    : (
        await Promise.all(teams.map((t) => findActiveQuarterForTeam(actor.orgId, t)))
      ).filter((q): q is NonNullable<typeof q> => q != null);
  const quarterIds = [...new Set(quartersInView.map((q) => q.id))];

  // A KPI hangs off one quarter, and that quarter belongs to one department,
  // so it can only apply to teams in that department. Offering the rest let a
  // KPI be created against another department's quarter, where its own team's
  // page would never find it.
  const teamsForQuarter = activeQuarter?.departmentId
    ? teams.filter((t) => t.departmentId === activeQuarter.departmentId)
    : teams;

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

  // One KpiTeam row per team a KPI is used by, across every quarter in view.
  const kpiTeams = quarterIds.length
    ? await prisma.kpiTeam.findMany({
        where: {
          kpi: { quarterId: { in: quarterIds } },
          ...(selectedTeam ? { teamId: selectedTeam.id } : { teamId: { in: teams.map((t) => t.id) } }),
        },
        include: {
          kpi: {
            include: {
              category: { select: { id: true, name: true } },
              owner: { select: { name: true } },
            },
          },
          team: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const memberWhere = selectedTeam ? { teamId: selectedTeam.id } : { teamId: { in: teams.map((t) => t.id) } };
  const teamMemberRecords = await prisma.member.findMany({ where: memberWhere, select: { id: true, name: true } });
  const memberIds = teamMemberRecords.map((m) => m.id);
  const teamMemberNames = new Map(teamMemberRecords.map((m) => [m.id, m.name]));

  const memberKpiScores = activeCycle
    ? await prisma.memberKpiScore.findMany({
        where: { cycleId: activeCycle.id, memberId: { in: memberIds }, kpiId: { in: kpiTeams.map((kt) => kt.kpiId) } },
      })
    : [];

  // A KPI is listed once however many teams use it. Its weight is per team,
  // so with several teams in view the spread is shown instead of one bar.
  const byKpi = new Map<string, typeof kpiTeams>();
  for (const kt of kpiTeams) {
    const bucket = byKpi.get(kt.kpiId);
    if (bucket) bucket.push(kt);
    else byKpi.set(kt.kpiId, [kt]);
  }

  const rows: KpiLibraryRow[] = [];
  const details: Record<string, KpiDetail> = {};

  for (const [kpiId, links] of byKpi) {
    const kpi = links[0].kpi;
    const weights = links.map((l) => l.weightPct);
    const scores = memberKpiScores.filter((s) => s.kpiId === kpiId);
    const avgScore = scores.length ? scores.reduce((s, r) => s + Number(r.score), 0) / scores.length : null;

    rows.push({
      kpiId,
      kpiTeamId: selectedTeam ? links[0].id : null,
      name: kpi.name,
      description: kpi.description,
      rubric: kpi.rubric,
      categoryId: kpi.category?.id ?? null,
      categoryName: kpi.category?.name ?? null,
      lifecycle: kpi.lifecycle,
      shareable: kpi.shareable,
      weightPct: selectedTeam ? links[0].weightPct : null,
      spread: selectedTeam
        ? null
        : { teamCount: links.length, min: Math.min(...weights), max: Math.max(...weights) },
      updatedLabel: timeAgo(kpi.updatedAt),
    });

    details[kpiId] = {
      kpiId,
      name: kpi.name,
      description: kpi.description,
      rubric: kpi.rubric,
      categoryName: kpi.category?.name ?? null,
      lifecycle: kpi.lifecycle,
      shareable: kpi.shareable,
      metricType: kpi.metricType,
      direction: kpi.direction,
      target: kpi.targetValue,
      unit: kpi.unit ?? kpi.metricType,
      currentValue: kpi.currentValue,
      weightPct: selectedTeam ? links[0].weightPct : null,
      avgScore,
      ownerName: kpi.owner?.name ?? null,
      scores: scores
        .map((sc) => ({ memberId: sc.memberId, name: teamMemberNames.get(sc.memberId) ?? "Unknown", score: Number(sc.score) }))
        .sort((a, b) => b.score - a.score),
    };
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));

  const activeCount = rows.filter((r) => r.lifecycle === "active").length;
  const draftCount = rows.filter((r) => r.lifecycle === "draft").length;
  // Averaged over the team-KPI pairs, since that is where a weight lives.
  const scoredWeights = kpiTeams.filter((kt) => kt.kpi.lifecycle !== "archived");
  const averageWeight = scoredWeights.length
    ? Math.round(scoredWeights.reduce((s, kt) => s + kt.weightPct, 0) / scoredWeights.length)
    : null;
  const totalWeight = selectedTeam
    ? scoredWeights.reduce((s, kt) => s + kt.weightPct, 0)
    : null;

  const canManage = actor.authRole === "admin" || actor.authRole === "hod";
  const scopeLabel = selectedTeam ? selectedTeam.name : "All teams";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, color: "#767FA5", fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>
            {departmentName} · {scopeLabel}
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", marginTop: 4 }}>KPIs</div>
          <div style={{ fontSize: 14, color: "#596392", marginTop: 4, maxWidth: 560, lineHeight: 1.55 }}>
            Create and manage the key performance indicators used to evaluate employee performance
            {quartersInView[0] ? ` in ${quarterLabel(quartersInView[0].year, quartersInView[0].index)}` : ""}.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {teams.length > 1 ? (
            <ScopePicker
              selectedId={selectedTeam?.id ?? ALL_TEAMS}
              basePath="/kpis"
              options={[
                {
                  id: ALL_TEAMS,
                  label: "View all",
                  meta: `${teams.length} teams`,
                  icon: "ant-design:appstore-outlined",
                },
                ...teams.map((t) => ({
                  id: t.id,
                  label: t.name,
                  meta: `${t._count.members} members`,
                  icon: "ant-design:team-outlined",
                })),
              ]}
            />
          ) : null}
          {canManage && selectedTeam && activeQuarter ? (
            <KpiLibraryDrawer
              kpis={libraryKpis.map((k) => ({ ...k, alreadyOnThisTeam: rows.some((r) => r.kpiId === k.kpiId) }))}
              teamId={selectedTeam.id}
              teamName={selectedTeam.name}
              remainingWeight={Math.max(0, 100 - (totalWeight ?? 0))}
            />
          ) : null}
          {canManage && selectedTeam && activeQuarter ? (
            <ImportKpisButton quarterId={activeQuarter.id} teamId={selectedTeam.id} teamName={selectedTeam.name} />
          ) : null}
          {canManage && selectedTeam && activeQuarter ? (
            <CreateKpiWizard
              quarterId={activeQuarter.id}
              teams={teamsForQuarter.map((t) => ({ id: t.id, name: t.name, memberCount: t._count?.members ?? 0 }))}
              categories={kpiCategories}
              existingWeights={allQuarterWeights}
              defaultTeamId={selectedTeam.id}
            />
          ) : null}
        </div>
      </div>

      {quarterIds.length === 0 ? (
        <EmptyState
          icon="ant-design:aim-outlined"
          title="No active quarter"
          body="KPIs are defined per quarter, and a quarter opens with its first month. Open this month from the dashboard, then add the metrics this team is measured on."
          actionHref="/hod-dashboard"
          actionLabel="Go to dashboard"
        />
      ) : (
        <>
          {!selectedTeam ? (
            <div className="piq-caption" style={{ lineHeight: 1.5 }}>
              Showing every team&rsquo;s KPIs. Pick a team to add, import or adopt one — a KPI belongs to a team&rsquo;s
              quarter, so there is no single budget to add to from here.
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <SummaryCard
              icon="ant-design:aim-outlined"
              label="Total active KPIs"
              value={String(activeCount)}
              sub={selectedTeam ? `${totalWeight}% of the weight budget used` : "in the current framework"}
            />
            <SummaryCard
              icon="ant-design:edit-outlined"
              label="Draft KPIs"
              value={String(draftCount)}
              sub={draftCount === 0 ? "nothing waiting to publish" : `${draftCount} not scored on yet`}
            />
            <SummaryCard
              icon="ant-design:percentage-outlined"
              label="Average KPI weight"
              value={averageWeight != null ? `${averageWeight}%` : "—"}
              sub={selectedTeam ? "per KPI on this team" : "per KPI across teams"}
            />
          </div>

          <KpiLibraryTable rows={rows} details={details} categories={kpiCategories} canManage={canManage} />
        </>
      )}
    </div>
  );
}

/** "2d ago" style stamps, matching the rest of the app's activity feeds. */
function timeAgo(date: Date): string {
  const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function SummaryCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div
      style={{
        flex: "1 1 220px",
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 22,
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            background: "rgba(39,63,249,.10)",
            color: "#273FF9",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <iconify-icon icon={icon} width="15" />
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 500, color: "#767FA5", letterSpacing: ".05em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums", marginTop: 12 }}>
        {value}
      </div>
      <div className="piq-caption" style={{ marginTop: 4 }}>
        {sub}
      </div>
    </div>
  );
}
