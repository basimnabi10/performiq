import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { FrostCard } from "@/components/ui/FrostCard";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { ReviewForm } from "@/components/reviews/ReviewForm";

export default async function ReviewDetailPage({ params }: PageProps<"/reviews/[id]">) {
  const { id } = await params;
  const actor = await getCurrentMember();

  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      reviewee: true,
      reviewer: { select: { name: true } },
      cycle: { select: { label: true } },
      kpiScores: true,
    },
  });
  if (!review) notFound();

  const isReviewer = review.reviewerId === actor.id;
  const canViewOnly =
    actor.authRole === "admin" ||
    (actor.authRole === "hod" && actor.departmentId === review.reviewee.departmentId) ||
    (actor.authRole === "manager" && actor.teamId === review.reviewee.teamId);

  if (!isReviewer && !canViewOnly) notFound();

  const readOnly = !isReviewer || review.status === "completed";

  const kpiTeams = review.reviewee.teamId
    ? await prisma.kpiTeam.findMany({
        where: { teamId: review.reviewee.teamId, kpi: { cycleId: review.cycleId } },
        include: { kpi: true },
      })
    : [];

  const scoreByKpi = new Map(review.kpiScores.map((s) => [s.kpiId, s]));

  const kpis = kpiTeams.map((kt) => ({
    kpiId: kt.kpiId,
    name: kt.kpi.name,
    description: kt.kpi.description,
    targetValue: kt.kpi.targetValue,
    unit: kt.kpi.unit,
    weightPct: kt.weightPct,
    initialRating: scoreByKpi.get(kt.kpiId)?.rating ?? null,
    initialComment: scoreByKpi.get(kt.kpiId)?.comment ?? null,
  }));

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
        <div className="piq-caption">
          No KPIs are set up for this member&rsquo;s team yet — create KPIs from the team&rsquo;s page
          before scoring this review.
        </div>
      ) : (
        <ReviewForm reviewId={review.id} kpis={kpis} readOnly={readOnly} />
      )}
    </div>
  );
}
