"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { AuthzError, requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { completeReview } from "@/lib/scoring";
import { logActivity } from "@/lib/audit";
import { assignReviewerSchema, saveReviewSchema, startReviewSchema } from "@/lib/validation/reviews.schema";

async function upsertKpiScores(
  reviewId: string,
  kpiScores: { kpiId: string; rating: number; comment?: string }[],
) {
  await prisma.$transaction(
    kpiScores.map((line) =>
      prisma.reviewKpiScore.upsert({
        where: { reviewId_kpiId: { reviewId, kpiId: line.kpiId } },
        create: { reviewId, kpiId: line.kpiId, rating: line.rating, comment: line.comment },
        update: { rating: line.rating, comment: line.comment },
      }),
    ),
  );
}

/**
 * Who may still write to a review, and why.
 *
 * A submitted review is not frozen: a manager who spots a mistake in their
 * own wording an hour later should fix it rather than leave a wrong record
 * standing. So the reviewer keeps write access for as long as the month is
 * open, and an admin can correct one at any point -- including after the
 * month closes, which is the only way to fix a genuine error in a finalised
 * score. Everyone else is read-only.
 */
async function assertCanEditReview(
  review: { reviewerId: string; cycleId: string },
  actor: { id: string; authRole: string },
): Promise<void> {
  if (actor.authRole === "admin") return;

  if (review.reviewerId !== actor.id) {
    throw new AuthzError("Only the assigned reviewer can edit this review.");
  }

  const cycle = await prisma.reviewCycle.findUnique({
    where: { id: review.cycleId },
    select: { status: true, label: true },
  });
  if (cycle?.status === "closed") {
    throw new Error(
      `${cycle.label} is closed, so this review can no longer be changed. Ask an admin to reopen the month or correct it for you.`,
    );
  }
}

export const saveReviewDraft = authActionClient
  .schema(saveReviewSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    const review = await prisma.review.findUnique({ where: { id: parsedInput.reviewId } });
    if (!review) throw new Error("Review not found.");
    await assertCanEditReview(review, actor);

    await upsertKpiScores(parsedInput.reviewId, parsedInput.kpiScores);
    await prisma.review.update({
      where: { id: parsedInput.reviewId },
      data: { status: "in_progress" },
    });

    revalidatePath(`/reviews/${parsedInput.reviewId}`);
  });

export const submitReview = authActionClient
  .schema(saveReviewSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    const review = await prisma.review.findUnique({ where: { id: parsedInput.reviewId } });
    if (!review) throw new Error("Review not found.");
    await assertCanEditReview(review, actor);

    await upsertKpiScores(parsedInput.reviewId, parsedInput.kpiScores);
    await completeReview(parsedInput.reviewId);

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb:
        review.status === "completed"
          ? "revised a submitted review"
          : review.type === "self"
            ? "submitted a self-review"
            : "submitted a review",
      targetType: "Review",
      targetId: review.id,
      metadata: { revieweeId: review.revieweeId },
    });

    revalidatePath("/reviews");
    revalidatePath(`/reviews/${parsedInput.reviewId}`);
    revalidatePath(`/members/${review.revieweeId}`);
  });

export const assignReviewer = authActionClient
  .schema(assignReviewerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const reviewee = await prisma.member.findUnique({ where: { id: parsedInput.revieweeId } });
    if (!reviewee) throw new Error("Member not found.");
    await requireScopeAccess(actor, { teamId: reviewee.teamId, departmentId: reviewee.departmentId });

    await prisma.$transaction(async (tx) => {
      await tx.reviewAssignment.upsert({
        where: {
          cycleId_revieweeId_reviewerId_type: {
            cycleId: parsedInput.cycleId,
            revieweeId: parsedInput.revieweeId,
            reviewerId: parsedInput.reviewerId,
            type: "peer",
          },
        },
        create: {
          cycleId: parsedInput.cycleId,
          revieweeId: parsedInput.revieweeId,
          reviewerId: parsedInput.reviewerId,
          type: "peer",
        },
        update: {},
      });

      await tx.review.upsert({
        where: {
          cycleId_revieweeId_reviewerId_type: {
            cycleId: parsedInput.cycleId,
            revieweeId: parsedInput.revieweeId,
            reviewerId: parsedInput.reviewerId,
            type: "peer",
          },
        },
        create: {
          cycleId: parsedInput.cycleId,
          revieweeId: parsedInput.revieweeId,
          reviewerId: parsedInput.reviewerId,
          type: "peer",
          status: "pending",
        },
        update: {},
      });
    });

    revalidatePath("/reviews");
  });

/**
 * Manually starts a single review shell (self/manager/peer) in a cycle —
 * for cases the cycle's own auto-generated shells don't cover, e.g. someone
 * who joined after the cycle started, or a manager change. `assignReviewer`
 * above stays peer-only for the existing peer-assignment flow; this covers
 * the general case from the Reviews page's "Start review" action.
 */
export const startReview = authActionClient
  .schema(startReviewSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod", "manager"]);

    const reviewee = await prisma.member.findUnique({ where: { id: parsedInput.revieweeId } });
    if (!reviewee) throw new Error("Member not found.");
    await requireScopeAccess(actor, { teamId: reviewee.teamId, departmentId: reviewee.departmentId });

    // A self-review's reviewer is always the reviewee themself — never trust
    // a client-supplied reviewerId for this type.
    const reviewerId = parsedInput.type === "self" ? reviewee.id : parsedInput.reviewerId;

    const review = await prisma.review.upsert({
      where: {
        cycleId_revieweeId_reviewerId_type: {
          cycleId: parsedInput.cycleId,
          revieweeId: parsedInput.revieweeId,
          reviewerId,
          type: parsedInput.type,
        },
      },
      create: {
        cycleId: parsedInput.cycleId,
        revieweeId: parsedInput.revieweeId,
        reviewerId,
        type: parsedInput.type,
        status: "pending",
      },
      update: {},
    });

    revalidatePath("/reviews");
    return { reviewId: review.id };
  });
