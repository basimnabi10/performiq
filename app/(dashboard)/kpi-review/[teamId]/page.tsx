import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentMember, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { findActiveCycle } from "@/lib/cycles";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReviewMemberCard } from "@/components/reviews/ReviewMemberCard";

/**
 * Step two: the people on the chosen team, and where each one's review stands.
 *
 * Status comes from the MANAGER review specifically. A member can have a
 * self-review sitting at "completed" while nobody has reviewed them at all,
 * and showing that as done would tell a reviewer their work is finished when
 * it has not started.
 */
export default async function KpiReviewTeamPage({ params }: PageProps<"/kpi-review/[teamId]">) {
  const actor = await getCurrentMember();
  if (actor.authRole === "ic") redirect("/my-dashboard");

  const { teamId } = await params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { department: { select: { name: true } } },
  });
  if (!team || team.orgId !== actor.orgId) notFound();
  await requireScopeAccess(actor, { teamId: team.id, departmentId: team.departmentId });

  const cycle = await findActiveCycle(actor);
  if (!cycle) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="piq-h1">{team.name}</div>
        <EmptyState
          icon="ant-design:calendar-outlined"
          title="No review month is open"
          body="Months open automatically on the 1st. Reviews for this team appear once the month is open."
        />
      </div>
    );
  }

  const members = await prisma.member.findMany({
    where: { teamId: team.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, jobTitle: true, avatarUrl: true },
  });

  const reviews = await prisma.review.findMany({
    where: { cycleId: cycle.id, revieweeId: { in: members.map((m) => m.id) }, type: "manager" },
    select: { id: true, revieweeId: true, reviewerId: true, status: true, overallScore: true },
  });

  const rows = members
    .filter((m) => m.id !== actor.id)
    .map((m) => {
      const mine = reviews.find((r) => r.revieweeId === m.id && r.reviewerId === actor.id);
      const submitted = reviews.find((r) => r.revieweeId === m.id && r.status === "completed");
      // The badge describes THIS reviewer's progress, not the row's. Someone
      // else's half-finished draft is not your draft, and showing it as
      // "Draft saved" next to a button that would start a fresh review tells
      // you that work exists when none of it is yours. A review someone has
      // already submitted is different: that is a finished record anyone
      // senior can read, so it shows as submitted and links to it.
      const review = mine ?? submitted;
      const status = mine
        ? mine.status
        : submitted
          ? ("completed" as const)
          : ("none" as const);
      return {
        memberId: m.id,
        name: m.name,
        jobTitle: m.jobTitle,
        avatarUrl: m.avatarUrl,
        reviewId: review?.id ?? null,
        isMine: Boolean(mine),
        status: status as "none" | "pending" | "in_progress" | "completed",
        score: review?.overallScore != null ? Number(review.overallScore) : null,
      };
    });

  const submitted = rows.filter((r) => r.status === "completed").length;
  const drafts = rows.filter((r) => r.status === "in_progress").length;
  const pending = rows.length - submitted - drafts;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div className="piq-caption">
          <Link href="/kpi-review" style={{ color: "var(--color-primary)", textDecoration: "none" }}>
            {cycle.label} review
          </Link>
          {" · "}
          {team.department?.name}
        </div>
        <div className="piq-h1" style={{ marginTop: 2 }}>
          {team.name}
        </div>
        <div className="piq-body" style={{ marginTop: 4 }}>
          Choose an employee to complete their {cycle.label} performance review.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16 }}>
        <StatCard label="Team size" value={rows.length} />
        <StatCard label="Pending reviews" value={pending} />
        <StatCard label="Draft reviews" value={drafts} />
        <StatCard label="Submitted" value={`${submitted} / ${rows.length}`} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="ant-design:user-add-outlined"
          title="Nobody to review on this team"
          body="Invite people into this team, and their review appears here for the open month."
          actionHref="/members"
          actionLabel="Invite members"
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 16 }}>
          {rows.map((r) => (
            <ReviewMemberCard key={r.memberId} row={r} cycleId={cycle.id} />
          ))}
        </div>
      )}
    </div>
  );
}
