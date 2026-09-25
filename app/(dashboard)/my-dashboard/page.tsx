import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/StatCard";
import { Tag } from "@/components/ui/Tag";
import { PerformanceBanner } from "@/components/dashboard/hod/PerformanceBanner";
import { TrendPanel } from "@/components/dashboard/hod/TrendPanel";
import { MyReviewHistory } from "@/components/dashboard/member/MyReviewHistory";
import { TeachALessonPanel } from "@/components/dashboard/member/TeachALessonPanel";
import { MoodCheckinWidget } from "@/components/mood/MoodCheckinWidget";
import { daysLeftInWeek, weekLabel, weekStart } from "@/lib/weeks";
import { isKpiScoreOnTarget } from "@/lib/kpi-status";

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default async function MyDashboardPage() {
  const member = await getCurrentMember();
  if (member.authRole === "hr") redirect("/hr");

  const [teammateCount, cycleHistory, todaysMood, myLessonRequests, myTeam] = await Promise.all([
    member.teamId
      ? prisma.member.count({ where: { teamId: member.teamId, id: { not: member.id } } })
      : Promise.resolve(0),
    prisma.reviewCycle.findMany({ where: { orgId: member.orgId }, orderBy: { startDate: "asc" } }),
    prisma.moodCheckin.findUnique({
      where: { memberId_date: { memberId: member.id, date: weekStart() } },
    }),
    prisma.lessonRequest.findMany({ where: { memberId: member.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    member.teamId
      ? prisma.team.findUnique({ where: { id: member.teamId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  const teamName = myTeam?.name ?? null;

  const activeCycle = cycleHistory.filter((c) => c.status === "in_progress").sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0] ?? null;

  const [kpiScores, reviewsToGive, assignments, myReviews] = await Promise.all([
    activeCycle
      ? prisma.memberKpiScore.findMany({
          where: { memberId: member.id, cycleId: activeCycle.id },
          include: { kpi: true },
        })
      : Promise.resolve([]),
    prisma.review.findMany({
      where: { reviewerId: member.id, revieweeId: { not: member.id }, status: { not: "completed" } },
      include: { reviewee: { select: { name: true } }, cycle: { select: { label: true } } },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.learningAssignment.findMany({ where: { memberId: member.id } }),
    prisma.review.findMany({
      where: { revieweeId: member.id },
      include: { cycle: { select: { label: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const onTarget = kpiScores.filter((s) => isKpiScoreOnTarget(Number(s.score), s.kpi)).length;

  const avgLearningProgress = assignments.length
    ? Math.round(assignments.reduce((s, a) => s + a.progressPct, 0) / assignments.length)
    : null;

  // ---- Real per-cycle trend for this member (no fabricated points) --------
  const trendPoints = [];
  for (const cycle of cycleHistory) {
    const scores = await prisma.memberKpiScore.findMany({
      where: { cycleId: cycle.id, memberId: member.id },
      select: { score: true },
    });
    if (scores.length) {
      trendPoints.push({ label: cycle.label, value: scores.reduce((s, r) => s + Number(r.score), 0) / scores.length });
    }
  }
  const overallScore = kpiScores.length ? kpiScores.reduce((s, r) => s + Number(r.score), 0) / kpiScores.length : null;

  // A trend point only exists for the active cycle once this member has been
  // scored in it — until then, the most recent trend point is a PAST cycle
  // and must not be presented as "this cycle" (that would misrepresent a
  // stale score as current).
  const activeCycleScored = overallScore != null;
  const currentPoint = activeCycleScored ? trendPoints[trendPoints.length - 1] : null;
  const prevPoint = activeCycleScored
    ? (trendPoints.length >= 2 ? trendPoints[trendPoints.length - 2] : null)
    : (trendPoints[trendPoints.length - 1] ?? null);
  const delta = prevPoint && currentPoint ? currentPoint.value - prevPoint.value : null;

  const firstName = member.name.split(" ")[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={{ fontSize: 14, color: "#767FA5", fontWeight: 500 }}>{teamName ?? "My workspace"}</div>
        <div style={{ fontSize: 36, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", marginTop: 2 }}>
          {member.name}
        </div>
        <div style={{ fontSize: 15, color: "#596392", marginTop: 3 }}>
          {activeCycle ? `${activeCycle.label} · My view` : "No review cycle is currently active"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 24, alignItems: "stretch" }}>
      <PerformanceBanner
        sentence={
          currentPoint
            ? `Averaging ${currentPoint.value.toFixed(1)}/5 this cycle${delta != null ? (delta >= 0 ? ", trending up" : ", trending down") : ""}.`
            : activeCycle
              ? `No score yet for ${activeCycle.label}.`
              : `Good to see you, ${firstName}.`
        }
        sub={
          currentPoint && delta != null && prevPoint
            ? `That's ${delta >= 0 ? "up" : "down"} from ${prevPoint.value.toFixed(1)}/5 in ${prevPoint.label}.`
            : !currentPoint && prevPoint
              ? `Most recent score: ${prevPoint.value.toFixed(1)}/5 in ${prevPoint.label}.`
              : activeCycle
                ? `${activeCycle.label} is in progress. You have ${teammateCount} teammate${teammateCount === 1 ? "" : "s"}.`
                : "No review cycle is currently active."
        }
        score={overallScore != null ? overallScore.toFixed(1) : "—"}
        deltaLabel={delta != null ? `${Math.abs(delta).toFixed(1)}` : "no prior data"}
        deltaUp={delta == null || delta >= 0}
        trend={trendPoints}
      />

      <StatCard label="KPIs on target" value={`${onTarget}/${kpiScores.length}`} icon="ant-design:aim-outlined" style={{ gridColumn: "span 2" }} />
      <StatCard label="Reviews to give" value={reviewsToGive.length} icon="ant-design:file-done-outlined" style={{ gridColumn: "span 2" }} />
      <StatCard
        label="Learning progress"
        value={avgLearningProgress != null ? `${avgLearningProgress}%` : "—"}
        icon="ant-design:read-outlined"
        style={{ gridColumn: "span 2" }}
      />

      <TrendPanel
        points={trendPoints}
        pillLabel={currentPoint ? (activeCycle?.label ?? "No active cycle") : (prevPoint?.label ?? "No scores yet")}
        scopeLabel="My"
      />
      <div style={{ gridColumn: "span 2" }}>
        <MoodCheckinWidget
          initialValue={todaysMood?.value ?? null}
          weekLabel={weekLabel()}
          daysLeft={daysLeftInWeek()}
        />
      </div>

      <MyReviewHistory
        reviews={myReviews.map((r) => ({
          id: r.id,
          cycleLabel: r.cycle.label,
          type: r.type,
          status: r.status,
          overallScore: r.overallScore != null ? Number(r.overallScore) : null,
        }))}
      />

      <div
        style={{
          gridColumn: "span 2",
          background: "rgba(255,255,255,.20)",
          border: "1px solid rgba(255,255,255,.40)",
          WebkitBackdropFilter: "blur(35px)",
          backdropFilter: "blur(35px)",
          boxShadow: "0 8px 24px rgba(0,0,0,.06)",
          borderRadius: 24,
          padding: 22,
        }}
      >
        <div className="piq-h3" style={{ marginBottom: 14 }}>
          Reviews assigned to me
        </div>
        {reviewsToGive.length === 0 ? (
          <div className="piq-caption">Nothing waiting on you right now.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reviewsToGive.map((r) => (
              <Link
                key={r.id}
                href={`/reviews/${r.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,.5)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <span style={{ fontSize: 13 }}>
                  {r.reviewee.name} · {r.cycle.label}
                </span>
                <Tag tone="neutral" dot>
                  {r.status}
                </Tag>
              </Link>
            ))}
          </div>
        )}
      </div>

      <TeachALessonPanel
        requests={myLessonRequests.map((r) => ({
          id: r.id,
          topic: r.topic,
          status: r.status,
          createdAgo: timeAgo(r.createdAt),
        }))}
      />
      </div>
    </div>
  );
}
