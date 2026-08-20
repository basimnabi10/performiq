"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { AuthzError, requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { completeReview } from "@/lib/scoring";
import { assignReviewerSchema, saveReviewSchema } from "@/lib/validation/reviews.schema";

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

export const saveReviewDraft = authActionClient
  .schema(saveReviewSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    const review = await prisma.review.findUnique({ where: { id: parsedInput.reviewId } });
    if (!review) throw new Error("Review not found.");
    if (review.reviewerId !== actor.id) {
      throw new AuthzError("Only the assigned reviewer can edit this review.");
    }
    if (review.status === "completed") {
      throw new Error("This review has already been submitted.");
    }

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
    if (review.reviewerId !== actor.id) {
      throw new AuthzError("Only the assigned reviewer can submit this review.");
    }
    if (review.status === "completed") {
      throw new Error("This review has already been submitted.");
    }

    await upsertKpiScores(parsedInput.reviewId, parsedInput.kpiScores);
    await completeReview(parsedInput.reviewId);

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
