import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentMember, requireSelfOrRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { DesignationModal } from "@/components/members/DesignationModal";
import { MemberHero } from "@/components/members/MemberHero";
import { MemberTrendChart } from "@/components/members/MemberTrendChart";

const STATUS_BADGE: Record<string, string> = {
  draft: "In progress",
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
};

export default async function MemberProfilePage({ params }: PageProps<"/members/[id]">) {
  const { id } = await params;
  const actor = await getCurrentMember();

  // requireSelfOrRole re-derives the target's department/team from the DB
  // and checks the requester's scope against it — an id existing is never
  // sufficient on its own (IDOR prevention).
  await requireSelfOrRole(actor, id, ["admin", "hod", "manager"]);

  const member = await prisma.member.findUnique({
    where: { id },
    include: { team: { select: { name: true } }, department: { select: { name: true } } },
  });
  if (!member) notFound();

  const canEdit = actor.authRole === "admin" || actor.authRole === "hod" || actor.authRole === "manager";

  const [activeCycle, cycleHistory] = member.departmentId
    ? await Promise.all([
        prisma.reviewCycle.findFirst({
          where: { departmentId: member.departmentId, status: "in_progress" },
          orderBy: { startDate: "desc" },
        }),
        prisma.reviewCycle.findMany({ where: { departmentId: member.departmentId }, orderBy: { startDate: "asc" } }),
      ])
    : [null, []];

  const memberKpiScores = activeCycle
    ? await prisma.memberKpiScore.findMany({
        where: { memberId: member.id, cycleId: activeCycle.id },
        include: { kpi: true },
        orderBy: { kpi: { name: "asc" } },
      })
    : [];

  const overallScore = memberKpiScores.length
    ? memberKpiScores.reduce((s, r) => s + Number(r.score), 0) / memberKpiScores.length
    : null;

  const kpisOnTarget = memberKpiScores.filter((s) => {
    if (s.kpi.targetNumeric == null) return false;
    return s.kpi.direction === "lower_is_better"
      ? Number(s.score) <= Number(s.kpi.targetNumeric)
      : Number(s.score) >= Number(s.kpi.targetNumeric);
  }).length;

  const reviews = await prisma.review.findMany({
    where: { revieweeId: member.id },
    include: { cycle: { select: { id: true, label: true, startDate: true } }, reviewer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const reviewsCompleted = reviews.filter((r) => r.status === "completed").length;

  const currentCycleReview =
    reviews.find((r) => r.cycle.id === activeCycle?.id && r.type === "manager") ??
    reviews.find((r) => r.cycle.id === activeCycle?.id) ??
    null;

  // ---- department rank (peers scored in the same active cycle) ----
  let rankLabel = "—";
  if (activeCycle && member.departmentId) {
    const peers = await prisma.member.findMany({ where: { departmentId: member.departmentId }, select: { id: true } });
    const peerIds = peers.map((p) => p.id);
    const peerScores = await prisma.memberKpiScore.findMany({
      where: { cycleId: activeCycle.id, memberId: { in: peerIds } },
    });
    const peerAvg = new Map<string, number>();
    for (const pid of peerIds) {
      const scores = peerScores.filter((s) => s.memberId === pid);
      if (scores.length) peerAvg.set(pid, scores.reduce((s, r) => s + Number(r.score), 0) / scores.length);
    }
    const ranked = Array.from(peerAvg.entries()).sort((a, b) => b[1] - a[1]);
    const position = ranked.findIndex(([mid]) => mid === member.id);
    if (position >= 0) rankLabel = `#${position + 1} of ${ranked.length}`;
  }

  // ---- learning completion ----
  const learningAssignments = await prisma.learningAssignment.findMany({ where: { memberId: member.id } });
  const learningPct = learningAssignments.length
    ? Math.round(learningAssignments.reduce((s, a) => s + a.progressPct, 0) / learningAssignments.length)
    : null;

  // ---- per-cycle real trend (no fabricated weekly/monthly points) ----
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
  const firstPoint = trendPoints[0] ?? null;
  const lastPoint = trendPoints[trendPoints.length - 1] ?? null;
  const heroDelta = firstPoint && lastPoint ? Math.round((lastPoint.value - firstPoint.value) * 10) / 10 : null;

  const statusKey = currentCycleReview ? currentCycleReview.status : member.status === "invited" ? "invited" : "pending";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <Link
        href="/members"
        style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, color: "#596392", textDecoration: "none", width: "fit-content" }}
      >
        <iconify-icon icon="ant-design:arrow-left-outlined" width="14" />
        Members
      </Link>

      <MemberHero
        name={member.name}
        jobTitle={member.jobTitle ?? "No title set"}
        teamName={member.team?.name ?? "Unassigned"}
        email={member.email}
        location={member.location}
        joinedLabel={member.joinedDate ? member.joinedDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : null}
        empId={member.empId}
        score={overallScore}
        deltaLabel={heroDelta != null ? Math.abs(heroDelta).toFixed(1) : null}
        deltaUp={heroDelta == null || heroDelta >= 0}
        statusKey={statusKey}
        reviewHref={currentCycleReview ? `/reviews/${currentCycleReview.id}` : null}
        ctaLabel={currentCycleReview?.status === "completed" ? "View review" : "Start review"}
        designationTrigger={
          canEdit ? (
            <DesignationModal
              memberId={member.id}
              currentTitle={member.jobTitle ?? ""}
              memberName={member.name}
              teamName={member.team?.name ?? "their team"}
            />
          ) : null
        }
      />

      <div style={{ display: "flex", gap: 16 }}>
        <SnapshotCard label="Department rank" value={rankLabel} />
        <SnapshotCard label="KPIs on target" value={memberKpiScores.length ? `${kpisOnTarget} of ${memberKpiScores.length}` : "—"} />
        <SnapshotCard label="Reviews completed" value={String(reviewsCompleted)} />
        <SnapshotCard label="Learning complete" value={learningPct != null ? `${learningPct}%` : "—"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 20, alignItems: "stretch" }}>
        <MemberTrendChart points={trendPoints} />

        <div
          style={{
            background: "rgba(255,255,255,.20)",
            border: "1px solid rgba(255,255,255,.40)",
            WebkitBackdropFilter: "blur(35px)",
            backdropFilter: "blur(35px)",
            boxShadow: "0 8px 24px rgba(0,0,0,.06)",
            borderRadius: 22,
            padding: 22,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>KPI breakdown</span>
            <Link href="/kpis" style={{ fontSize: 13, fontWeight: 500, color: "#273FF9" }}>
              All KPIs
            </Link>
          </div>
          {memberKpiScores.length === 0 ? (
            <div className="piq-caption">No KPI scores yet for this cycle.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {memberKpiScores.map((s) => (
                <div key={s.id}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 13,
                        color: "#454D7A",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.kpi.name}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums", flexShrink: 0, marginLeft: 10 }}>
                      {Number(s.score).toFixed(1)}/5
                    </span>
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: "rgba(202,205,220,.4)" }}>
                    <div
                      style={{
                        width: `${Math.round((Number(s.score) / 5) * 100)}%`,
                        height: "100%",
                        borderRadius: 99,
                        background: "linear-gradient(90deg,#3A63FA,#273FF9)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,.20)",
          border: "1px solid rgba(255,255,255,.40)",
          WebkitBackdropFilter: "blur(35px)",
          backdropFilter: "blur(35px)",
          boxShadow: "0 8px 24px rgba(0,0,0,.06)",
          borderRadius: 22,
          padding: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>Review history</div>
            <div style={{ fontSize: 12, color: "#767FA5", marginTop: 2 }}>Past performance reviews for {member.name.split(" ")[0]}</div>
          </div>
          {currentCycleReview ? (
            <Link
              href={`/reviews/${currentCycleReview.id}`}
              style={{
                height: 40,
                padding: "0 16px",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                font: "500 13px 'Switzer',sans-serif",
                borderRadius: 12,
                cursor: "pointer",
                color: "#273FF9",
                background: "rgba(58,99,250,.1)",
                border: "1px solid rgba(58,99,250,.18)",
                textDecoration: "none",
              }}
            >
              <iconify-icon icon={currentCycleReview.status === "completed" ? "ant-design:eye-outlined" : "ant-design:file-add-outlined"} width="15" />
              {currentCycleReview.status === "completed" ? "View review" : "Start review"}
            </Link>
          ) : null}
        </div>
        {reviews.length === 0 ? (
          <div className="piq-caption">No reviews yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {reviews.map((r) => {
              const done = r.status === "completed";
              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "15px 4px",
                    borderTop: "1px solid rgba(168,175,203,.22)",
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: done ? "rgba(58,99,250,.12)" : "#252944",
                      color: done ? "#273FF9" : "#fff",
                    }}
                  >
                    <iconify-icon icon={done ? "ant-design:file-done-outlined" : "ant-design:edit-outlined"} width="18" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>{r.cycle.label}</div>
                    <div style={{ fontSize: 12, color: "#767FA5", marginTop: 1 }}>
                      Reviewer: {r.reviewer.name}
                      {r.submittedAt ? ` · submitted ${r.submittedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", width: 96 }}>
                    <div style={{ fontSize: 16, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>
                      {r.overallScore != null ? Number(r.overallScore).toFixed(1) : "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "#A8AFCB" }}>{r.overallScore != null ? "of 5.0" : "not scored"}</div>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "5px 11px",
                      borderRadius: 8,
                      width: 96,
                      color: done ? "#273FF9" : r.status === "in_progress" ? "#596392" : "#fff",
                      background: done ? "rgba(58,99,250,.13)" : r.status === "in_progress" ? "rgba(89,99,146,.16)" : "#252944",
                    }}
                  >
                    {STATUS_BADGE[r.status]}
                  </span>
                  <Link
                    href={`/reviews/${r.id}`}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: "rgba(58,99,250,.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#273FF9",
                      flexShrink: 0,
                    }}
                  >
                    <iconify-icon icon={done ? "ant-design:eye-outlined" : "ant-design:arrow-right-outlined"} width="15" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SnapshotCard({ label, value }: { label: string; value: string }) {
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
      <div style={{ fontSize: 24, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums", marginTop: 4 }}>{value}</div>
    </div>
  );
}
