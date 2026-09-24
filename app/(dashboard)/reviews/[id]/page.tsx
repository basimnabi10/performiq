import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { FrostCard } from "@/components/ui/FrostCard";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { ReviewThisPersonButton } from "@/components/reviews/ReviewThisPersonButton";
import { RevieweeResponse } from "@/components/reviews/RevieweeResponse";
import { CreateKpiWizard } from "@/components/kpis/CreateKpiWizard";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function ReviewDetailPage({ params }: PageProps<"/reviews/[id]">) {
  const { id } = await params;
  const actor = await getCurrentMember();

  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      reviewee: true,
      reviewer: { select: { name: true } },
      cycle: {
        select: {
          id: true,
          label: true,
          quarterId: true,
          status: true,
          quarter: { select: { status: true, year: true, index: true } },
        },
      },
      kpiScores: true,
    },
  });
  if (!review) notFound();

  const isReviewer = review.reviewerId === actor.id;

  // The person a review is about can read it once it is submitted. Until this
  // existed, a manager could finish a review and the only person it described
  // had no way to open it -- their own dashboard linked to a 404.
  const isRevieweeOfSubmitted = review.revieweeId === actor.id && review.status === "completed";

  const canViewOnly =
    actor.authRole === "admin" ||
    (actor.authRole === "hod" && actor.departmentId === review.reviewee.departmentId) ||
    (actor.authRole === "manager" && actor.teamId === review.reviewee.teamId);

  if (!isReviewer && !canViewOnly && !isRevieweeOfSubmitted) notFound();

  // These must mirror assertCanEditReview in actions/reviews.ts. When they
  // drifted apart the page disabled a form the server would happily have
  // accepted, which reads to the user as "you are not allowed" rather than
  // "these two files disagree".
  const quarterClosed = review.cycle.quarter?.status === "closed";
  const monthClosed = review.cycle.status === "closed";
  const isOwnSelfReview = review.type === "self" && review.reviewee.id === actor.id;
  const someoneElsesSelfReview = review.type === "self" && !isOwnSelfReview;
  const canEdit = someoneElsesSelfReview
    ? false
    : actor.authRole === "admin"
      ? !quarterClosed
      : isReviewer && !monthClosed;

  // A self-review belongs to the person being reviewed. Someone senior
  // opening it should be told that plainly and pointed at their own review of
  // that person -- the old wording ("Only Usama Javed can score this review")
  // read as though nobody but the employee may ever review them.
  const isSelfReview = review.type === "self";
  const canReviewThemselves =
    !isReviewer &&
    review.reviewee.id !== actor.id &&
    (actor.authRole === "admin" || actor.authRole === "hod" || actor.authRole === "manager");

  const readOnly = !canEdit;
  const readOnlyReason = !readOnly
    ? undefined
    : quarterClosed && actor.authRole === "admin"
      ? `Q${review.cycle.quarter?.index} ${review.cycle.quarter?.year} is finished, so its reviews are final.`
      : isSelfReview
        ? `This is ${review.reviewee.name}'s own self-review, so only they can fill it in.`
        : !isReviewer
          ? `${review.reviewer.name} is the assigned reviewer for this one.`
          : `${review.cycle.label} is closed, so this review can no longer be changed. Ask an admin to correct it for you.`;

  const kpiTeams = review.reviewee.teamId
    ? await prisma.kpiTeam.findMany({
        where: {
          teamId: review.reviewee.teamId,
          // Retired KPIs keep the scores already given against them, but no
          // new review asks about them.
          kpi: { quarterId: review.cycle.quarterId ?? "", lifecycle: { not: "archived" } },
        },
        include: { kpi: true },
      })
    : [];

  // A reviewer who opens a review and finds no KPIs had to go to the KPIs
  // page, build the framework, then find their way back. The wizard is
  // offered here instead — same component, same weight budget.
  const canManageKpis = actor.authRole === "admin" || actor.authRole === "hod";
  const quarterId = review.cycle.quarterId;
  const canAddKpis = canManageKpis && !!quarterId && !!review.reviewee.teamId && !quarterClosed;

  const [wizardTeams, kpiCategories, quarterWeights] = canAddKpis
    ? await Promise.all([
        prisma.team.findMany({
          where: actor.authRole === "admin" ? { orgId: actor.orgId } : { departmentId: actor.departmentId ?? "" },
          orderBy: { name: "asc" },
          include: { _count: { select: { members: true } } },
        }),
        prisma.kpiCategory.findMany({
          where: { orgId: actor.orgId },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        prisma.kpiTeam.findMany({
          where: { kpi: { quarterId } },
          include: { kpi: { select: { id: true, name: true } } },
        }),
      ])
    : [[], [], []];

  const scoreByKpi = new Map(review.kpiScores.map((s) => [s.kpiId, s]));

  const kpis = kpiTeams.map((kt) => ({
    kpiId: kt.kpiId,
    name: kt.kpi.name,
    description: kt.kpi.description,
    targetValue: kt.kpi.targetValue,
    unit: kt.kpi.unit,
    weightPct: kt.weightPct,
    metricType: kt.kpi.metricType,
    rubric: kt.kpi.rubric,
    initialRating: scoreByKpi.get(kt.kpiId)?.rating ?? null,
    initialComment: scoreByKpi.get(kt.kpiId)?.comment ?? null,
  }));

  const createKpiButton = canAddKpis ? (
    <CreateKpiWizard
      quarterId={quarterId}
      teams={wizardTeams.map((t) => ({ id: t.id, name: t.name, memberCount: t._count?.members ?? 0 }))}
      categories={kpiCategories}
      existingWeights={quarterWeights.map((kt) => ({
        kpiTeamId: kt.id,
        kpiId: kt.kpiId,
        teamId: kt.teamId,
        kpiName: kt.kpi.name,
        weightPct: kt.weightPct,
      }))}
      defaultTeamId={review.reviewee.teamId ?? undefined}
      variant={kpis.length === 0 ? "primary" : "secondary"}
      size="sm"
    />
  ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/reviews" className="piq-caption" style={{ textDecoration: "none" }}>
        ← Back to reviews
      </Link>

      <FrostCard style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Avatar name={review.reviewee.name} size={52} round />
        <div style={{ flex: 1 }}>
          <div className="piq-h2">{review.reviewee.name}</div>
          <div className="piq-caption">
            {review.cycle.label} · {review.type === "self" ? "Self review" : review.type === "manager" ? "Manager review" : "Peer review"} ·
            reviewed by {review.reviewer.name}
          </div>
        </div>
        <Tag tone={review.status === "completed" ? "complete" : "neutral"} dot>
          {review.status}
        </Tag>
      </FrostCard>

      {kpis.length === 0 ? (
        <EmptyState
          icon="ant-design:aim-outlined"
          title="No KPIs to score yet"
          body={
            canAddKpis
              ? `${review.reviewee.name}'s team has no KPIs for this quarter, so there is nothing to rate. Create the first one to start the review.`
              : "This member's team has no KPIs for this quarter yet. Ask an admin or your HOD to set them up before scoring this review."
          }
          action={createKpiButton}
        />
      ) : (
        <>
          {createKpiButton ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className="piq-caption">
                Scoring {kpis.length} {kpis.length === 1 ? "KPI" : "KPIs"} · missing one?
              </span>
              {createKpiButton}
            </div>
          ) : null}
          <ReviewForm
            reviewId={review.id}
            kpis={kpis}
            readOnly={readOnly}
            readOnlyReason={readOnlyReason}
            submitted={review.status === "completed"}
            submittedLabel={
              review.submittedAt
                ? review.submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                : undefined
            }
            returnTo={review.reviewee.teamId ? `/kpi-review/${review.reviewee.teamId}` : undefined}
          />
        </>
      )}

      {review.status === "completed" ? (
        <RevieweeResponse
          reviewId={review.id}
          existing={review.revieweeComment}
          repliedAt={review.revieweeRepliedAt ? review.revieweeRepliedAt.toISOString() : null}
          canReply={review.revieweeId === actor.id}
          revieweeName={review.reviewee.name}
        />
      ) : null}

      {readOnly && canReviewThemselves && !quarterClosed ? (
        <FrostCard tone="solid" padding={20} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text-strong)" }}>
              Want to review {review.reviewee.name} yourself?
            </div>
            <div className="piq-caption" style={{ marginTop: 3, lineHeight: 1.55 }}>
              This opens your own {review.cycle.label} review of them, separate from the one above.
            </div>
          </div>
          <ReviewThisPersonButton
            memberId={review.reviewee.id}
            memberName={review.reviewee.name}
            cycleId={review.cycle.id}
          />
        </FrostCard>
      ) : null}
    </div>
  );
}
