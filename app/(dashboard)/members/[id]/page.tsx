import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentMember, requireSelfOrRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";
import { FrostCard } from "@/components/ui/FrostCard";
import { StatCard } from "@/components/ui/StatCard";
import { Tag } from "@/components/ui/Tag";
import { DesignationModal } from "@/components/members/DesignationModal";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  invited: "Invitation pending",
};

const REVIEW_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
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

  const cycle = member.departmentId
    ? (await prisma.reviewCycle.findFirst({
        where: { departmentId: member.departmentId, status: "in_progress" },
        orderBy: { startDate: "desc" },
      })) ??
      (await prisma.reviewCycle.findFirst({
        where: { departmentId: member.departmentId },
        orderBy: { startDate: "desc" },
      }))
    : null;

  const memberKpiScores = cycle
    ? await prisma.memberKpiScore.findMany({
        where: { memberId: member.id, cycleId: cycle.id },
        include: { kpi: true },
      })
    : [];

  const kpisOnTarget = memberKpiScores.filter((s) => {
    if (s.kpi.targetNumeric == null) return false;
    return s.kpi.direction === "lower_is_better"
      ? Number(s.score) <= Number(s.kpi.targetNumeric)
      : Number(s.score) >= Number(s.kpi.targetNumeric);
  }).length;

  const reviews = await prisma.review.findMany({
    where: { revieweeId: member.id },
    include: { cycle: { select: { label: true } }, reviewer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const reviewsCompleted = reviews.filter((r) => r.status === "completed").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/members" className="piq-caption" style={{ textDecoration: "none" }}>
        ← Back to members
      </Link>

      <FrostCard tone="ink" style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Avatar name={member.name} size={72} round />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="piq-h1" style={{ color: "#fff" }}>
              {member.name}
            </span>
            <Tag tone={member.status === "active" ? "onTrack" : "neutral"} dot>
              {STATUS_LABEL[member.status]}
            </Tag>
          </div>
          <div style={{ color: "#A8AFCB", fontSize: 14, marginTop: 4 }}>
            {member.jobTitle ?? "No title set"} · {member.team?.name ?? "Unassigned"}
          </div>
          {canEdit ? (
            <div style={{ marginTop: 10 }}>
              <DesignationModal memberId={member.id} currentTitle={member.jobTitle ?? ""} />
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 18, marginTop: 16, color: "#767FA5", fontSize: 13 }}>
            <span>{member.email}</span>
            {member.location ? <span>{member.location}</span> : null}
            {member.empId ? <span>ID {member.empId}</span> : null}
          </div>
        </div>
      </FrostCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
        <StatCard label="Department" value={member.department?.name ?? "—"} icon="ant-design:apartment-outlined" />
        <StatCard
          label="KPIs on target"
          value={memberKpiScores.length ? `${kpisOnTarget}/${memberKpiScores.length}` : "—"}
          icon="ant-design:aim-outlined"
        />
        <StatCard label="Reviews completed" value={reviewsCompleted} icon="ant-design:file-done-outlined" />
      </div>

      <FrostCard>
        <div className="piq-h3" style={{ marginBottom: 12 }}>
          KPI breakdown{cycle ? ` · ${cycle.label}` : ""}
        </div>
        {memberKpiScores.length === 0 ? (
          <div className="piq-caption">No KPI scores yet for this cycle.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {memberKpiScores.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13 }}>{s.kpi.name}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{Number(s.score).toFixed(1)} / 5</span>
              </div>
            ))}
          </div>
        )}
      </FrostCard>

      <FrostCard>
        <div className="piq-h3" style={{ marginBottom: 12 }}>
          Review history
        </div>
        {reviews.length === 0 ? (
          <div className="piq-caption">No reviews yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reviews.map((r) => (
              <Link
                key={r.id}
                href={`/reviews/${r.id}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", color: "inherit" }}
              >
                <span className="piq-caption">
                  {r.cycle.label} · {r.type} · reviewed by {r.reviewer.name}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {r.overallScore != null ? Number(r.overallScore).toFixed(1) : "—"}
                  </span>
                  <Tag tone={r.status === "completed" ? "complete" : "neutral"} dot>
                    {REVIEW_STATUS_LABEL[r.status]}
                  </Tag>
                </div>
              </Link>
            ))}
          </div>
        )}
      </FrostCard>
    </div>
  );
}
