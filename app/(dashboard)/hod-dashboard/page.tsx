import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { InviteMemberModal } from "@/components/members/InviteMemberModal";
import { StartCycleModal } from "@/components/cycles/StartCycleModal";
import { CreateKpiModal } from "@/components/kpis/CreateKpiModal";
import { ScopePicker } from "@/components/dashboard/hod/ScopePicker";
import { PerformanceBanner } from "@/components/dashboard/hod/PerformanceBanner";
import { TeamPerformanceCard } from "@/components/dashboard/hod/TeamPerformanceCard";
import { TrendPanel } from "@/components/dashboard/hod/TrendPanel";
import { LearningDonut } from "@/components/dashboard/hod/LearningDonut";
import { PeopleHighlightCard } from "@/components/dashboard/hod/PeopleHighlightCard";
import { KpiPerformancePanel } from "@/components/dashboard/hod/KpiPerformancePanel";
import { PendingActionsPanel } from "@/components/dashboard/hod/PendingActionsPanel";
import { UpcomingDeadlinesPanel } from "@/components/dashboard/hod/UpcomingDeadlinesPanel";
import { TeamMoodPanel } from "@/components/dashboard/hod/TeamMoodPanel";
import { LessonRequestsPanel } from "@/components/dashboard/hod/LessonRequestsPanel";
import { RecentActivityFeed } from "@/components/dashboard/hod/RecentActivityFeed";

const TEAM_GRADIENTS = ["8BB0FF,#3A63FA", "A8AFCB,#596392", "C8CBE1,#6262A8", "B8BED6,#767FA5"];
const TEAM_ICONS = [
  "ant-design:bg-colors-outlined",
  "ant-design:appstore-outlined",
  "ant-design:cluster-outlined",
  "ant-design:apartment-outlined",
];

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function isPastDue(dueDate: Date | null): boolean {
  return dueDate != null && dueDate.getTime() < Date.now();
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

export default async function HodDashboardPage({ searchParams }: PageProps<"/hod-dashboard">) {
  const actor = await getCurrentMember();
  if (actor.authRole !== "admin" && actor.authRole !== "hod") {
    redirect("/my-dashboard");
  }

  const { team: rawTeam } = await searchParams;
  const teamParam = Array.isArray(rawTeam) ? rawTeam[0] : rawTeam;

  const allTeams = await prisma.team.findMany({
    where: actor.authRole === "admin" ? { orgId: actor.orgId } : { departmentId: actor.departmentId ?? "" },
    orderBy: { name: "asc" },
  });

  const selectedTeam = allTeams.find((t) => t.id === teamParam);
  const scopeTeamIds = selectedTeam ? [selectedTeam.id] : allTeams.map((t) => t.id);

  const departmentName =
    actor.authRole === "admin"
      ? "Organization"
      : (await prisma.department.findUnique({ where: { id: actor.departmentId ?? "" }, select: { name: true } }))?.name ?? "Department";

  const cycleScopeWhere =
    actor.authRole === "admin" ? { orgId: actor.orgId } : { orgId: actor.orgId, departmentId: actor.departmentId };

  const [activeCycle, cycleHistory] = await Promise.all([
    prisma.reviewCycle.findFirst({ where: { ...cycleScopeWhere, status: "in_progress" }, orderBy: { startDate: "desc" } }),
    prisma.reviewCycle.findMany({ where: cycleScopeWhere, orderBy: { startDate: "asc" } }),
  ]);

  if (!activeCycle) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="piq-h1">{departmentName}</div>
        <div className="piq-caption">
          No review cycle is active yet.
        </div>
        <StartCycleModal departmentId={actor.authRole === "hod" ? actor.departmentId ?? undefined : undefined} />
      </div>
    );
  }

  const members = await prisma.member.findMany({
    where: { teamId: { in: scopeTeamIds } },
    include: { team: { select: { name: true } } },
  });
  const memberIds = members.map((m) => m.id);
  const allScopeMembers = await prisma.member.findMany({
    where: { teamId: { in: allTeams.map((t) => t.id) } },
    select: { id: true },
  });
  const allScopeMemberIds = allScopeMembers.map((m) => m.id);

  const [kpis, memberKpiScores, reviews, learningAssignments, courses, lessonRequests, moodCheckins, auditLogs] =
    await Promise.all([
      prisma.kpi.findMany({
        where: { cycleId: activeCycle.id, kpiTeams: { some: { teamId: { in: scopeTeamIds } } } },
        include: { kpiTeams: { where: { teamId: { in: scopeTeamIds } } } },
      }),
      prisma.memberKpiScore.findMany({ where: { cycleId: activeCycle.id, memberId: { in: memberIds } } }),
      prisma.review.findMany({
        where: { cycleId: activeCycle.id, revieweeId: { in: memberIds } },
      }),
      prisma.learningAssignment.findMany({ where: { memberId: { in: memberIds } } }),
      prisma.course.count({ where: { orgId: actor.orgId, status: "published" } }),
      prisma.lessonRequest.findMany({
        where: { status: "pending", memberId: { in: allScopeMemberIds } },
        include: { member: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.moodCheckin.findMany({
        where: {
          memberId: { in: memberIds },
          date: new Date(new Date().toISOString().slice(0, 10)),
        },
        include: { member: { select: { name: true } } },
      }),
      prisma.auditLog.findMany({
        where: actor.authRole === "admin" ? { orgId: actor.orgId } : { orgId: actor.orgId, actorId: { in: allScopeMemberIds } },
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

  // ---- Overall aggregates ----
  const memberAvg = new Map<string, number>();
  for (const memberId of memberIds) {
    const scores = memberKpiScores.filter((s) => s.memberId === memberId);
    if (scores.length) memberAvg.set(memberId, scores.reduce((s, r) => s + Number(r.score), 0) / scores.length);
  }
  const overallScores = Array.from(memberAvg.values());
  const overallAvg = overallScores.length ? overallScores.reduce((s, v) => s + v, 0) / overallScores.length : null;

  const completedReviews = reviews.filter((r) => r.status === "completed").length;
  const reviewCompletionPct = reviews.length ? Math.round((completedReviews / reviews.length) * 100) : 0;

  const learningTotal = learningAssignments.length;
  const learningCompleted = learningAssignments.filter((a) => a.status === "completed").length;
  const learningInProgress = learningAssignments.filter((a) => a.status === "in_progress").length;
  const learningOverdue = learningAssignments.filter(
    (a) => a.status !== "completed" && isPastDue(a.dueDate),
  ).length;
  const learningCompletionPct = learningTotal ? Math.round((learningCompleted / learningTotal) * 100) : 0;

  // ---- Per-cycle historical trend (real cycles only, no fabricated points) ----
  const trendPoints = [];
  for (const cycle of cycleHistory) {
    const scores = await prisma.memberKpiScore.findMany({
      where: { cycleId: cycle.id, memberId: { in: allScopeMemberIds } },
      select: { score: true },
    });
    if (scores.length) {
      trendPoints.push({
        label: cycle.label,
        value: scores.reduce((s, r) => s + Number(r.score), 0) / scores.length,
      });
    }
  }
  const prevCyclePoint = trendPoints.length >= 2 ? trendPoints[trendPoints.length - 2] : null;
  const currentPoint = trendPoints[trendPoints.length - 1] ?? null;
  const delta = prevCyclePoint && currentPoint ? currentPoint.value - prevCyclePoint.value : null;

  // ---- Team performance cards ----
  const teamsToShow = selectedTeam ? [selectedTeam] : allTeams;
  const teamCards = await Promise.all(
    teamsToShow.map(async (team, i) => {
      const teamMembers = members.filter((m) => m.teamId === team.id);
      const teamMemberIds = teamMembers.map((m) => m.id);
      const teamAvgScores = teamMemberIds.map((id) => memberAvg.get(id)).filter((v): v is number => v != null);
      const teamAvg = teamAvgScores.length ? teamAvgScores.reduce((s, v) => s + v, 0) / teamAvgScores.length : null;
      const teamReviews = reviews.filter((r) => teamMemberIds.includes(r.revieweeId));
      const teamCompletion = teamReviews.length
        ? Math.round((teamReviews.filter((r) => r.status === "completed").length / teamReviews.length) * 100)
        : 0;
      return {
        teamId: team.id,
        name: team.name,
        memberCount: teamMembers.length,
        avgScore: teamAvg,
        completionPct: teamCompletion,
        deltaLabel: null as string | null,
        deltaUp: true,
        gradient: TEAM_GRADIENTS[i % TEAM_GRADIENTS.length],
        icon: TEAM_ICONS[i % TEAM_ICONS.length],
      };
    }),
  );

  // ---- People highlights ----
  const scoredMembers = members.filter((m) => memberAvg.has(m.id));
  const sorted = scoredMembers.slice().sort((a, b) => (memberAvg.get(b.id) ?? 0) - (memberAvg.get(a.id) ?? 0));
  const topPerformers = sorted.slice(0, 4).map((m, i) => ({
    id: m.id,
    name: m.name,
    subtitle: m.jobTitle ?? m.team?.name ?? "",
    score: memberAvg.get(m.id) ?? 0,
    rank: i + 1,
  }));
  const overdueMemberIds = new Set(
    reviews.filter((r) => r.status !== "completed").map((r) => r.revieweeId),
  );
  const needsAttention = sorted
    .slice()
    .reverse()
    .slice(0, 4)
    .map((m) => ({
      id: m.id,
      name: m.name,
      subtitle: overdueMemberIds.has(m.id) ? "Review in progress" : m.team?.name ?? "",
      score: memberAvg.get(m.id) ?? 0,
    }));

  // ---- KPI performance panel ----
  const kpiPanelEntries = kpis.map((kpi) => {
    const kpiScores = memberKpiScores.filter((s) => s.kpiId === kpi.id);
    const teamAvg = kpiScores.length ? kpiScores.reduce((s, r) => s + Number(r.score), 0) / kpiScores.length : null;
    const leaders = kpiScores
      .slice()
      .sort((a, b) => Number(b.score) - Number(a.score))
      .slice(0, 8)
      .map((s) => {
        const m = members.find((mm) => mm.id === s.memberId);
        return { memberId: s.memberId, name: m?.name ?? "Unknown", score: Number(s.score) };
      });
    return {
      kpiId: kpi.id,
      name: kpi.name,
      icon: "ant-design:aim-outlined",
      quantifier: kpi.metricType,
      target: kpi.targetValue,
      teamAvg,
      leaders,
    };
  });

  // ---- Pending actions ----
  const pendingReviews = reviews.filter((r) => r.status === "pending" || r.status === "in_progress").length;
  const learningNotStarted = learningAssignments.filter((a) => a.status === "not_started").length;
  const membersWithoutReview = members.filter((m) => !reviews.some((r) => r.revieweeId === m.id)).length;
  const kpisNeedingUpdate = kpis.filter((k) => k.status === "new").length;

  const pendingActions = [
    {
      icon: "ant-design:audit-outlined",
      title: "Reviews awaiting completion",
      badgeLabel: pendingReviews > 0 ? "Action needed" : "All caught up",
      badgeTone: pendingReviews > 0 ? ("neutral" as const) : ("clear" as const),
      count: pendingReviews,
      actionLabel: "Review",
      href: "/reviews",
    },
    {
      icon: "ant-design:usergroup-add-outlined",
      title: "Contributor requests",
      badgeLabel: lessonRequests.length > 0 ? "Pending" : "None pending",
      badgeTone: lessonRequests.length > 0 ? ("neutral" as const) : ("clear" as const),
      count: lessonRequests.length,
      actionLabel: "View",
      href: "#lesson-requests",
    },
    {
      icon: "ant-design:read-outlined",
      title: "Learning assignments pending",
      badgeLabel: learningNotStarted > 0 ? "Not started" : "All assigned",
      badgeTone: learningNotStarted > 0 ? ("neutral" as const) : ("clear" as const),
      count: learningNotStarted,
      actionLabel: "Assign",
      href: "/learning",
    },
    {
      icon: "ant-design:exclamation-circle-outlined",
      title: "Employees missing reviews",
      badgeLabel: membersWithoutReview > 0 ? "Overdue" : "None missing",
      badgeTone: membersWithoutReview > 0 ? ("urgent" as const) : ("clear" as const),
      count: membersWithoutReview,
      actionLabel: "Remind",
      href: "/members",
    },
    {
      icon: "ant-design:aim-outlined",
      title: "KPIs not yet scored",
      badgeLabel: kpisNeedingUpdate > 0 ? "Due this cycle" : "All scored",
      badgeTone: kpisNeedingUpdate > 0 ? ("neutral" as const) : ("clear" as const),
      count: kpisNeedingUpdate,
      actionLabel: "Update",
      href: "/teams",
    },
  ];

  // ---- Upcoming deadlines ----
  const daysToEnd = daysUntil(activeCycle.endDate);
  const soonestDue = learningAssignments
    .filter((a) => a.status !== "completed" && a.dueDate)
    .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))[0];

  const deadlines = [
    ...(membersWithoutReview > 0
      ? [
          {
            icon: "ant-design:warning-outlined",
            title: `${membersWithoutReview} review${membersWithoutReview === 1 ? "" : "s"} not started`,
            meta: `${departmentName} · action now`,
            urgent: true,
          },
        ]
      : []),
    { icon: "ant-design:flag-outlined", title: `${activeCycle.label} cycle ends`, meta: `All teams · in ${daysToEnd} days` },
    ...(soonestDue
      ? [
          {
            icon: "ant-design:read-outlined",
            title: "Learning assignment due",
            meta: `Due ${soonestDue.dueDate!.toLocaleDateString()}`,
          },
        ]
      : []),
  ];

  // ---- Team mood ----
  const distribution: Record<number, number> = {};
  for (const c of moodCheckins) distribution[c.value] = (distribution[c.value] ?? 0) + 1;
  const moodAvg = moodCheckins.length
    ? moodCheckins.reduce((s, c) => s + c.value, 0) / moodCheckins.length
    : null;
  const moodLabels: Record<number, string> = { 5: "Great", 4: "Good", 3: "Okay", 2: "Low", 1: "Struggling" };
  const moodEmojis: Record<number, string> = { 5: "😄", 4: "🙂", 3: "😐", 2: "😕", 1: "😣" };
  const moodNotes = moodCheckins
    .filter((c) => c.reason)
    .slice(0, 4)
    .map((c) => ({
      name: c.member.name,
      emoji: moodEmojis[c.value] ?? "😐",
      label: moodLabels[c.value] ?? "",
      reason: c.reason!,
    }));

  const canCreateKpi = teamsToShow.length > 0;
  const roleViewLabel = actor.authRole === "admin" ? "Admin view" : "Head of Department view";
  const breadcrumb = actor.authRole === "admin" ? departmentName : `${departmentName} Department`;
  const overviewTitle = actor.authRole === "admin" ? "Organization overview" : "Department overview";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, color: "#767FA5", fontWeight: 500 }}>{breadcrumb}</div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", marginTop: 2 }}>
            {overviewTitle}
          </div>
          <div style={{ fontSize: 14, color: "#596392", marginTop: 3 }}>
            {activeCycle.label} · {roleViewLabel}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <ScopePicker
            selectedId={selectedTeam?.id ?? "all"}
            basePath="/hod-dashboard"
            options={[
              { id: "all", label: "All teams", meta: `${allTeams.length} teams`, icon: "ant-design:appstore-outlined" },
              ...allTeams.map((t) => ({
                id: t.id,
                label: t.name,
                meta: `${members.filter((m) => m.teamId === t.id).length} members`,
                icon: "ant-design:team-outlined",
              })),
            ]}
          />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              padding: "8px 13px",
              borderRadius: 8,
              color: "#273FF9",
              background: "rgba(58,99,250,.13)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#273FF9", boxShadow: "0 0 0 3px rgba(39,63,249,.18)" }} />
            {activeCycle.label} · {daysToEnd} days left
          </span>
          <StartCycleModal departmentId={actor.authRole === "hod" ? actor.departmentId ?? undefined : undefined} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <InviteMemberModal teams={allTeams.map((t) => ({ id: t.id, name: t.name }))} />
        <StartCycleModal
          departmentId={actor.authRole === "hod" ? actor.departmentId ?? undefined : undefined}
          variant="secondary"
          icon="ant-design:reload-outlined"
        />
        <Link href="/learning" style={{ textDecoration: "none" }}>
          <Button variant="secondary" icon="ant-design:read-outlined">
            Assign learning
          </Button>
        </Link>
        {canCreateKpi ? (
          <CreateKpiModal cycleId={activeCycle.id} teamId={(selectedTeam ?? teamsToShow[0]).id} />
        ) : null}
        <Button variant="secondary" icon="ant-design:download-outlined" disabled>
          Export report
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 24, alignItems: "stretch" }}>
        <PerformanceBanner
          sentence={
            currentPoint
              ? `Averaging ${currentPoint.value.toFixed(1)}/5 this cycle${delta != null ? (delta >= 0 ? ", trending up" : ", trending down") : ""}.`
              : "Scores will appear here once reviews start coming in."
          }
          sub={
            delta != null && prevCyclePoint
              ? `That's ${delta >= 0 ? "up" : "down"} from ${prevCyclePoint.value.toFixed(1)}/5 in ${prevCyclePoint.label}.`
              : "This is the first cycle with scored KPIs — no prior comparison yet."
          }
          score={overallAvg != null ? overallAvg.toFixed(1) : "—"}
          deltaLabel={delta != null ? `${Math.abs(delta).toFixed(1)}` : "no prior data"}
          deltaUp={delta == null || delta >= 0}
          trend={trendPoints}
        />

        <div style={{ gridColumn: "span 6", fontSize: 12, fontWeight: 500, color: "#767FA5", letterSpacing: ".04em", textTransform: "uppercase" }}>
          Department overview
        </div>
        <StatCard label="Overall performance" value={overallAvg != null ? overallAvg.toFixed(1) : "—"} unit="/5" icon="ant-design:rise-outlined" style={{ gridColumn: "span 1" }} />
        <StatCard label="Review completion" value={`${reviewCompletionPct}%`} icon="ant-design:file-done-outlined" style={{ gridColumn: "span 1" }} />
        <StatCard label="Learning completion" value={`${learningCompletionPct}%`} icon="ant-design:read-outlined" style={{ gridColumn: "span 1" }} />
        <StatCard label="Total members" value={members.length} icon="ant-design:team-outlined" style={{ gridColumn: "span 1" }} />
        <StatCard label="Active review cycle" value={activeCycle.label} icon="ant-design:sync-outlined" style={{ gridColumn: "span 1" }} />
        <StatCard label="Avg KPI score" value={overallAvg != null ? overallAvg.toFixed(1) : "—"} unit="/5" icon="ant-design:aim-outlined" style={{ gridColumn: "span 1" }} />

        <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#767FA5", letterSpacing: ".04em", textTransform: "uppercase" }}>
            Team performance
          </span>
          <Link href="/teams" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500, color: "#273FF9", textDecoration: "none" }}>
            Compare teams
            <iconify-icon icon="ant-design:arrow-right-outlined" width="13" />
          </Link>
        </div>
        {teamCards.map((tc) => (
          <TeamPerformanceCard key={tc.teamId} {...tc} />
        ))}

        <TrendPanel points={trendPoints} pillLabel={activeCycle.label} />
        <LearningDonut assigned={learningTotal} completed={learningCompleted} inProgress={learningInProgress} overdue={learningOverdue} />

        <div style={{ gridColumn: "1/-1", fontSize: 12, fontWeight: 500, color: "#767FA5", letterSpacing: ".04em", textTransform: "uppercase" }}>
          People highlights
        </div>
        <PeopleHighlightCard title="Top performers" actionLabel="View all" rows={topPerformers} emptyText="No scores yet this cycle." />
        <PeopleHighlightCard title="Needs attention" actionLabel="Plan reviews" rows={needsAttention} emptyText="Nothing flagged." />

        <div style={{ gridColumn: "1/-1", fontSize: 12, fontWeight: 500, color: "#767FA5", letterSpacing: ".04em", textTransform: "uppercase" }}>
          Performance by KPI
        </div>
        <KpiPerformancePanel kpis={kpiPanelEntries} />

        <PendingActionsPanel actions={pendingActions} />
        <UpcomingDeadlinesPanel deadlines={deadlines} />

        <TeamMoodPanel
          checkinCount={moodCheckins.length}
          totalMembers={members.length}
          avgValue={moodAvg}
          distribution={distribution}
          notes={moodNotes}
        />
        <div id="lesson-requests" style={{ gridColumn: "span 2" }}>
          <LessonRequestsPanel
            requests={lessonRequests.map((r) => ({
              id: r.id,
              memberName: r.member.name,
              topic: r.topic,
              why: r.why,
              createdAgo: timeAgo(r.createdAt),
            }))}
          />
        </div>

        <RecentActivityFeed
          rows={auditLogs.map((a) => ({ id: a.id, actorName: a.actor.name, verb: a.verb, timeAgo: timeAgo(a.createdAt) }))}
        />
      </div>

      <div className="piq-caption">{courses} published courses available to assign.</div>
    </div>
  );
}
