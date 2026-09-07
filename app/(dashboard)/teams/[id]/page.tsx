import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { findActiveCycleForDepartment } from "@/lib/cycles";
import { FrostCard } from "@/components/ui/FrostCard";
import { MembersTable } from "@/components/members/MembersTable";
import { InviteMemberModal } from "@/components/members/InviteMemberModal";
import { TeamKpiTable } from "@/components/kpis/TeamKpiTable";
import { TeamKpiCreateModal, METRIC_ICON } from "@/components/kpis/TeamKpiCreateModal";
import { kpiMeasurementStatus } from "@/lib/kpi-status";

export default async function TeamDetailPage({ params, searchParams }: PageProps<"/teams/[id]">) {
  const { id } = await params;
  const { tab } = await searchParams;
  const actor = await getCurrentMember();

  const team = await prisma.team.findFirst({
    where: { id, orgId: actor.orgId },
    include: {
      lead: { select: { name: true } },
      department: { select: { name: true } },
      members: { orderBy: { name: "asc" }, include: { team: { select: { name: true } } } },
    },
  });
  if (!team) notFound();

  const activeCycle = await findActiveCycleForDepartment(actor.orgId, team.departmentId);

  // KPIs are created per cycle, so this page must scope to the active one —
  // otherwise every past cycle's KPIs pile up in the tab and its count.
  const kpiTeams = activeCycle
    ? await prisma.kpiTeam.findMany({
        where: { teamId: team.id, kpi: { cycleId: activeCycle.id } },
        include: { kpi: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const memberIds = team.members.map((m) => m.id);
  const [manageReviews, kpiScores] = activeCycle
    ? await Promise.all([
        prisma.review.findMany({
          where: { cycleId: activeCycle.id, revieweeId: { in: memberIds }, type: "manager" },
          select: { revieweeId: true, status: true },
        }),
        prisma.memberKpiScore.findMany({
          where: { cycleId: activeCycle.id, memberId: { in: memberIds } },
          select: { memberId: true, kpiId: true, score: true },
        }),
      ])
    : [[], []];
  const reviewByMember = new Map(manageReviews.map((r) => [r.revieweeId, r.status]));
  const scoreByMember = new Map<string, number[]>();
  const scoreByKpi = new Map<string, number[]>();
  for (const s of kpiScores) {
    scoreByMember.set(s.memberId, [...(scoreByMember.get(s.memberId) ?? []), Number(s.score)]);
    scoreByKpi.set(s.kpiId, [...(scoreByKpi.get(s.kpiId) ?? []), Number(s.score)]);
  }
  const avg = (values: number[] | undefined) =>
    values?.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
  const cycleOverdue = activeCycle ? new Date() > activeCycle.endDate : false;
  function reviewStatusFor(memberId: string, status: string): "reviewed" | "in_progress" | "overdue" | "not_started" | "invited" {
    if (status === "invited") return "invited";
    if (!activeCycle) return "not_started";
    const reviewStatus = reviewByMember.get(memberId);
    if (reviewStatus === "completed") return "reviewed";
    if (!reviewStatus) return "not_started";
    return cycleOverdue ? "overdue" : "in_progress";
  }

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

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg,#8BB0FF,#3A63FA)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 8px 20px rgba(58,99,250,.3)",
              flexShrink: 0,
            }}
          >
            <iconify-icon icon={team.name.toLowerCase().includes("design") ? "ant-design:bg-colors-outlined" : "ant-design:appstore-outlined"} width={26} />
          </span>
          <div>
            <div style={{ fontSize: 13, color: "#767FA5", fontWeight: 500 }}>
              {team.department?.name ? `${team.department.name} Department` : "Department"}
            </div>
            <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", marginTop: 1 }}>{team.name}</div>
            <div style={{ fontSize: 14, color: "#596392", marginTop: 2 }}>
              {team.members.length} members · {kpiTeams.length} KPIs
              {team.lead ? ` · ${team.lead.name}, lead` : ""}
            </div>
          </div>
        </div>
        {canManage ? (
          activeTab === "members" ? (
            <InviteMemberModal teams={[{ id: team.id, name: team.name }]} simple kpiCount={kpiTeams.length} />
          ) : activeCycle ? (
            <TeamKpiCreateModal
              cycleId={activeCycle.id}
              teamId={team.id}
              teamName={team.name}
              existingKpis={kpiTeams.map((kt) => ({
                kpiTeamId: kt.id,
                name: kt.kpi.name,
                icon: METRIC_ICON[kt.kpi.metricType as keyof typeof METRIC_ICON] ?? "ant-design:aim-outlined",
                weightPct: kt.weightPct,
              }))}
            />
          ) : null
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          padding: 5,
          background: "rgba(255,255,255,.45)",
          border: "1px solid rgba(255,255,255,.65)",
          borderRadius: 14,
          width: "fit-content",
        }}
      >
        {(
          [
            { id: "members", label: "Members", icon: "ant-design:team-outlined", count: team.members.length },
            { id: "kpis", label: "KPIs", icon: "ant-design:aim-outlined", count: kpiTeams.length },
          ] as const
        ).map((t) => {
          const active = t.id === activeTab;
          return (
            <Link
              key={t.id}
              href={`/teams/${team.id}${t.id === "kpis" ? "?tab=kpis" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
                color: active ? "#fff" : "#596392",
                background: active ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "transparent",
                boxShadow: active ? "0 6px 16px rgba(39,63,249,.3)" : "none",
              }}
            >
              <iconify-icon icon={t.icon} width={16} />
              {t.label} <span style={{ opacity: 0.7 }}>{t.count}</span>
            </Link>
          );
        })}
      </div>

      {activeTab === "members" ? (
        <MembersTable
          showTeam={false}
          rows={team.members.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            jobTitle: m.jobTitle,
            teamName: m.team?.name ?? null,
            reviewStatus: reviewStatusFor(m.id, m.status),
            kpiScore: avg(scoreByMember.get(m.id)),
          }))}
        />
      ) : activeCycle ? (
        <TeamKpiTable
          rows={kpiTeams.map((kt) => ({
            kpiTeamId: kt.id,
            name: kt.kpi.name,
            icon: METRIC_ICON[kt.kpi.metricType as keyof typeof METRIC_ICON] ?? "ant-design:aim-outlined",
            quantifier:
              kt.kpi.description ||
              `Quantifier: ${kt.kpi.metricType}, ${kt.kpi.direction === "lower_is_better" ? "lower" : "higher"} is better`,
            target: kt.kpi.targetValue,
            unit: kt.kpi.unit ?? kt.kpi.metricType,
            currentValue: kt.kpi.currentValue,
            measurementStatus: kpiMeasurementStatus(kt.kpi.currentNumeric, kt.kpi),
            hasTarget: kt.kpi.targetNumeric != null,
            weightPct: kt.weightPct,
            avgScore: avg(scoreByKpi.get(kt.kpiId)),
          }))}
        />
      ) : (
        <FrostCard>
          <div className="piq-caption">
            No active review cycle for this team yet — start one from the department dashboard
            before adding KPIs.
          </div>
        </FrostCard>
      )}
    </div>
  );
}
