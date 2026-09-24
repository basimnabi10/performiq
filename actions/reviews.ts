"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { AuthzError, requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { completeReview } from "@/lib/scoring";
import { logActivity } from "@/lib/audit";
import { redirect } from "next/navigation";
import {
  assignReviewerSchema,
  openMemberReviewSchema,
  respondToReviewSchema,
  saveReviewSchema,
  startReviewSchema,
} from "@/lib/validation/reviews.schema";

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
  review: { reviewerId: string; cycleId: string; type: string; revieweeId: string },
  actor: { id: string; authRole: string },
): Promise<void> {
  // A self-review is the person's own account of their work. Nobody else
  // completes it -- not an admin, not their HOD -- because a score submitted
  // in someone's name, in their own voice, is not a correction but an
  // impersonation. Reviewing that person is done through your OWN review of
  // them (see openMemberReview).
  if (review.type === "self" && review.revieweeId !== actor.id) {
    throw new AuthzError("A self-review can only be completed by the person it belongs to.");
  }

  const cycle = await prisma.reviewCycle.findUnique({
    where: { id: review.cycleId },
    select: { status: true, label: true, quarter: { select: { status: true, year: true, index: true } } },
  });

  // An admin can correct any review -- including a submitted one, and
  // including a month that has closed -- but only while its QUARTER is still
  // running. Once the quarter is finalised its average is a published number
  // that people have been reviewed and compared on, and silently moving it
  // afterwards makes every report that quoted it wrong.
  if (actor.authRole === "admin") {
    if (cycle?.quarter && cycle.quarter.status === "closed") {
      throw new Error(
        `Q${cycle.quarter.index} ${cycle.quarter.year} is finished, so its reviews are final and can no longer be edited.`,
      );
    }
    return;
  }

  if (review.reviewerId !== actor.id) {
    throw new AuthzError("Only the assigned reviewer can edit this review.");
  }

  if (cycle?.status === "closed") {
    throw new Error(
      `${cycle.label} is closed, so this review can no longer be changed. Ask an admin to correct it for you.`,
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

/**
 * Entry point for the team -> member -> review flow: opens the review the
 * current person should be filling in for someone, creating it if it does not
 * exist yet.
 *
 * Reviews are generated as shells when a month opens, but only for the
 * member themself (self) and their manager. Someone senior reviewing outside
 * that line -- an HOD covering for an absent manager, an admin correcting a
 * gap -- has no shell waiting, and a "Review now" button that dead-ends is
 * worse than one that creates the review it promises.
 */
export const openMemberReview = authActionClient
  .schema(openMemberReviewSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod", "manager"]);

    const reviewee = await prisma.member.findUnique({ where: { id: parsedInput.memberId } });
    if (!reviewee || reviewee.orgId !== actor.orgId) throw new Error("Member not found.");
    await requireScopeAccess(actor, { teamId: reviewee.teamId, departmentId: reviewee.departmentId });

    if (reviewee.id === actor.id) {
      throw new Error("Use your own dashboard to complete your self-review.");
    }

    const review = await prisma.review.upsert({
      where: {
        cycleId_revieweeId_reviewerId_type: {
          cycleId: parsedInput.cycleId,
          revieweeId: reviewee.id,
          reviewerId: actor.id,
          type: "manager",
        },
      },
      create: {
        cycleId: parsedInput.cycleId,
        revieweeId: reviewee.id,
        reviewerId: actor.id,
        type: "manager",
        status: "pending",
      },
      update: {},
    });

    revalidatePath("/reviews");
    redirect(`/reviews/${review.id}`);
  });

/**
 * The reviewee's reply to their own completed review.
 *
 * Only they can write it, and only once the review is submitted — replying to
 * a draft would mean answering something the reviewer has not finished saying.
 * The reply does not change any score; it sits beside the review so the record
 * is not one-sided.
 */
export const respondToReview = authActionClient
  .schema(respondToReviewSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;

    const review = await prisma.review.findUnique({ where: { id: parsedInput.reviewId } });
    if (!review) throw new Error("Review not found.");

    if (review.revieweeId !== actor.id) {
      throw new AuthzError("Only the person a review is about can reply to it.");
    }
    if (review.status !== "completed") {
      throw new Error("You can reply once your reviewer has submitted this review.");
    }

    await prisma.review.update({
      where: { id: review.id },
      data: { revieweeComment: parsedInput.body.trim(), revieweeRepliedAt: new Date() },
    });

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb: "replied to their review",
      targetType: "Review",
      targetId: review.id,
      metadata: {},
    });

    revalidatePath(`/reviews/${review.id}`);
    revalidatePath("/my-dashboard");
  });
