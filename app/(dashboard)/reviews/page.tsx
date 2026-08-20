import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import type { Prisma, ReviewStatus } from "@/lib/generated/prisma/client";
import { FrostCard } from "@/components/ui/FrostCard";
import { ReviewsTable } from "@/components/reviews/ReviewsTable";
import { AssignReviewerModal } from "@/components/reviews/AssignReviewerModal";

export default async function ReviewsPage({ searchParams }: PageProps<"/reviews">) {
  const actor = await getCurrentMember();
  if (actor.authRole === "ic") {
    redirect("/my-dashboard");
  }

  const { status: rawStatus } = await searchParams;
  const statusParam = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const VALID_STATUSES: ReviewStatus[] = ["draft", "pending", "in_progress", "completed"];
  const status = VALID_STATUSES.find((s) => s === statusParam);

  const scopeFilter: Prisma.ReviewWhereInput =
    actor.authRole === "admin"
      ? { cycle: { orgId: actor.orgId } }
      : actor.authRole === "hod"
        ? { reviewee: { departmentId: actor.departmentId } }
        : { reviewee: { teamId: actor.teamId } };

  const reviews = await prisma.review.findMany({
    where: {
      ...scopeFilter,
      ...(status ? { status } : {}),
    },
    include: { reviewee: { select: { name: true } }, reviewer: { select: { name: true } }, cycle: { select: { label: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const activeCycle = await prisma.reviewCycle.findFirst({
    where:
      actor.authRole === "admin"
        ? { orgId: actor.orgId, status: "in_progress" }
        : { orgId: actor.orgId, status: "in_progress", departmentId: actor.departmentId },
    orderBy: { startDate: "desc" },
  });

  const scopedMembers = activeCycle
    ? await prisma.member.findMany({
        where:
          actor.authRole === "admin"
            ? { orgId: actor.orgId }
            : actor.authRole === "hod"
              ? { departmentId: actor.departmentId }
              : { teamId: actor.teamId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const completed = reviews.filter((r) => r.status === "completed").length;
  const avgScore = (() => {
    const scored = reviews.filter((r) => r.overallScore != null);
    if (scored.length === 0) return null;
    return scored.reduce((s, r) => s + Number(r.overallScore), 0) / scored.length;
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="piq-h1">Reviews</div>
          <div className="piq-caption">
            {completed} completed · {reviews.length} total{avgScore != null ? ` · avg ${avgScore.toFixed(1)}` : ""}
          </div>
        </div>
        {activeCycle && scopedMembers.length > 1 && (actor.authRole === "admin" || actor.authRole === "hod") ? (
          <AssignReviewerModal cycleId={activeCycle.id} members={scopedMembers} />
        ) : null}
      </div>

      <FrostCard>
        <ReviewsTable
          rows={reviews.map((r) => ({
            id: r.id,
            revieweeId: r.revieweeId,
            revieweeName: r.reviewee.name,
            reviewerName: r.reviewer.name,
            cycleLabel: r.cycle.label,
            type: r.type,
            status: r.status,
            overallScore: r.overallScore != null ? Number(r.overallScore) : null,
          }))}
        />
      </FrostCard>
    </div>
  );
}
