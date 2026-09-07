import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import type { Prisma, ReviewStatus } from "@/lib/generated/prisma/client";
import { FrostCard } from "@/components/ui/FrostCard";
import { StatCard } from "@/components/ui/StatCard";
import { ReviewsTable } from "@/components/reviews/ReviewsTable";
import { ReviewsFilterBar } from "@/components/reviews/ReviewsFilterBar";
import { ReviewsCycleTabs } from "@/components/reviews/ReviewsCycleTabs";
import { AssignReviewerModal } from "@/components/reviews/AssignReviewerModal";
import { StartReviewModal } from "@/components/reviews/StartReviewModal";

export default async function ReviewsPage({ searchParams }: PageProps<"/reviews">) {
  const actor = await getCurrentMember();
  if (actor.authRole === "ic") {
    redirect("/my-dashboard");
  }

  const { status: rawStatus, team: rawTeam, q: rawQ, minScore: rawMinScore, view: rawView, sort: rawSort } = await searchParams;
  const statusParam = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const teamParam = Array.isArray(rawTeam) ? rawTeam[0] : rawTeam;
  const qParam = Array.isArray(rawQ) ? rawQ[0] : rawQ;
  const minScoreParam = Array.isArray(rawMinScore) ? rawMinScore[0] : rawMinScore;
  const viewParam = Array.isArray(rawView) ? rawView[0] : rawView;
  const sortParam = Array.isArray(rawSort) ? rawSort[0] : rawSort;
  const VALID_STATUSES: ReviewStatus[] = ["draft", "pending", "in_progress", "completed"];
  const status = VALID_STATUSES.find((s) => s === statusParam);
  const minScore = minScoreParam ? Number(minScoreParam) : null;
  const view = viewParam === "history" ? "history" : "current";
  const sort = sortParam === "score_desc" || sortParam === "score_asc" ? sortParam : "recent";

  const scopeFilter: Prisma.ReviewWhereInput =
    actor.authRole === "admin"
      ? { cycle: { orgId: actor.orgId } }
      : actor.authRole === "hod"
        ? { reviewee: { departmentId: actor.departmentId } }
        : { reviewee: { teamId: actor.teamId } };

  const activeCycle = await prisma.reviewCycle.findFirst({
    where:
      actor.authRole === "admin"
        ? { orgId: actor.orgId, status: "in_progress" }
        : { orgId: actor.orgId, status: "in_progress", departmentId: actor.departmentId },
    orderBy: { startDate: "desc" },
  });

  const orderBy: Prisma.ReviewOrderByWithRelationInput =
    sort === "score_desc" ? { overallScore: "desc" } : sort === "score_asc" ? { overallScore: "asc" } : { createdAt: "desc" };

  const reviews = await prisma.review.findMany({
    where: {
      ...scopeFilter,
      ...(status ? { status } : {}),
      ...(teamParam ? { reviewee: { teamId: teamParam } } : {}),
      ...(qParam ? { reviewee: { name: { contains: qParam, mode: "insensitive" } } } : {}),
      ...(minScore != null ? { overallScore: { gte: minScore } } : {}),
      ...(view === "current"
        ? activeCycle
          ? { cycleId: activeCycle.id }
          : { id: "__none__" } // no active cycle: "current" view has nothing to show
        : activeCycle
          ? { cycleId: { not: activeCycle.id } }
          : {}),
    },
    include: { reviewee: { select: { name: true } }, reviewer: { select: { name: true } }, cycle: { select: { label: true } } },
    orderBy,
    take: 100,
  });

  const teams = await prisma.team.findMany({
    where:
      actor.authRole === "admin"
        ? { orgId: actor.orgId }
        : { departmentId: actor.departmentId ?? "" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const scopedMembers = activeCycle
    ? await prisma.member.findMany({
        where:
          actor.authRole === "admin"
            ? { orgId: actor.orgId }
            : actor.authRole === "hod"
              ? { departmentId: actor.departmentId }
              : { teamId: actor.teamId },
        select: { id: true, name: true, managerId: true },
        orderBy: { name: "asc" },
      })
    : [];

  const canManage = actor.authRole === "admin" || actor.authRole === "hod";

  const completed = reviews.filter((r) => r.status === "completed").length;
  const pending = reviews.filter((r) => r.status !== "completed").length;
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
            {view === "current"
              ? activeCycle
                ? `${activeCycle.label} cycle`
                : "No active cycle"
              : "History"}{" "}
            · {completed} completed · {pending} pending
          </div>
        </div>
        {activeCycle && canManage ? (
          <div style={{ display: "flex", gap: 10 }}>
            {scopedMembers.length > 1 ? <AssignReviewerModal cycleId={activeCycle.id} members={scopedMembers} /> : null}
            <StartReviewModal cycleId={activeCycle.id} members={scopedMembers} />
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <StatCard label="Completed" value={completed} icon="ant-design:check-circle-outlined" />
        <StatCard label="Pending" value={pending} icon="ant-design:clock-circle-outlined" />
        <StatCard label="Avg score" value={avgScore != null ? avgScore.toFixed(1) : "—"} unit={avgScore != null ? "/5" : undefined} icon="ant-design:star-outlined" />
        <StatCard label="Showing" value={reviews.length} icon="ant-design:filter-outlined" />
      </div>

      <ReviewsCycleTabs view={view} basePath="/reviews" />

      <ReviewsFilterBar teams={teams} basePath="/reviews" />

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
            date: r.submittedAt ?? r.createdAt,
          }))}
        />
      </FrostCard>
    </div>
  );
}
