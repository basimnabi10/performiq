import Link from "next/link";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { FrostCard } from "@/components/ui/FrostCard";
import { StatCard } from "@/components/ui/StatCard";
import { Tag } from "@/components/ui/Tag";
import { MoodCheckinWidget } from "@/components/mood/MoodCheckinWidget";

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export default async function MyDashboardPage() {
  const member = await getCurrentMember();

  const [teammateCount, activeCycle, todaysMood] = await Promise.all([
    member.teamId
      ? prisma.member.count({ where: { teamId: member.teamId, id: { not: member.id } } })
      : Promise.resolve(0),
    prisma.reviewCycle.findFirst({
      where: { orgId: member.orgId, status: "in_progress" },
      orderBy: { startDate: "desc" },
    }),
    prisma.moodCheckin.findUnique({
      where: { memberId_date: { memberId: member.id, date: todayDateOnly() } },
    }),
  ]);

  const [kpiScores, reviewsToGive, assignments] = await Promise.all([
    activeCycle
      ? prisma.memberKpiScore.findMany({
          where: { memberId: member.id, cycleId: activeCycle.id },
          include: { kpi: true },
        })
      : Promise.resolve([]),
    prisma.review.findMany({
      where: { reviewerId: member.id, status: { not: "completed" } },
      include: { reviewee: { select: { name: true } }, cycle: { select: { label: true } } },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.learningAssignment.findMany({ where: { memberId: member.id } }),
  ]);

  const onTarget = kpiScores.filter((s) => {
    if (s.kpi.targetNumeric == null) return false;
    return s.kpi.direction === "lower_is_better"
      ? Number(s.score) <= Number(s.kpi.targetNumeric)
      : Number(s.score) >= Number(s.kpi.targetNumeric);
  }).length;

  const avgLearningProgress = assignments.length
    ? Math.round(assignments.reduce((s, a) => s + a.progressPct, 0) / assignments.length)
    : null;

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
        <StatCard label="KPIs on target" value={`${onTarget}/${kpiScores.length}`} icon="ant-design:aim-outlined" />
        <StatCard label="Reviews to give" value={reviewsToGive.length} icon="ant-design:file-done-outlined" />
        <StatCard
          label="Learning progress"
          value={avgLearningProgress != null ? `${avgLearningProgress}%` : "—"}
          icon="ant-design:read-outlined"
        />
      </div>

      <FrostCard>
        <div className="piq-h3" style={{ marginBottom: 10 }}>
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
                  background: "rgba(255,255,255,.35)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <span style={{ fontSize: 13 }}>
                  {r.type === "self" ? "Your self-review" : r.reviewee.name} · {r.cycle.label}
                </span>
                <Tag tone="neutral" dot>
                  {r.status}
                </Tag>
              </Link>
            ))}
          </div>
        )}
      </FrostCard>

      <MoodCheckinWidget initialValue={todaysMood?.value ?? null} />

      <FrostCard>
        <div className="piq-caption">
          Want to teach a lesson? Head to{" "}
          <Link href="/learning" style={{ color: "#8BB0FF" }}>
            Learning
          </Link>{" "}
          to request access or pick up an assigned course.
        </div>
      </FrostCard>
    </div>
  );
}
