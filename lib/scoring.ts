import "server-only";

import type { Prisma, PrismaClient, ReviewType } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = PrismaClient | Prisma.TransactionClient;

/**
 * Weighted overall score for a single review: Σ(rating × kpiTeamWeight) / Σweight,
 * using the reviewee's team weight for each scored KPI. Falls back to an
 * unweighted average if the reviewee has no team (or no KpiTeam weight is
 * found for a scored KPI — treated as weight 0, i.e. excluded).
 */
export async function computeWeightedOverallScore(
  tx: Tx,
  reviewId: string,
): Promise<number | null> {
  const review = await tx.review.findUniqueOrThrow({
    where: { id: reviewId },
    include: {
      kpiScores: true,
      reviewee: { select: { teamId: true } },
    },
  });

  if (review.kpiScores.length === 0) return null;

  let weightedSum = 0;
  let weightTotal = 0;

  for (const line of review.kpiScores) {
    let weight = 1;
    if (review.reviewee.teamId) {
      const kpiTeam = await tx.kpiTeam.findUnique({
        where: { kpiId_teamId: { kpiId: line.kpiId, teamId: review.reviewee.teamId } },
        select: { weightPct: true },
      });
      weight = kpiTeam?.weightPct ?? 1;
    }
    weightedSum += line.rating * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) return null;
  return Math.round((weightedSum / weightTotal) * 100) / 100;
}

/**
 * MemberKpiScore aggregation policy (documented, intentionally simple for
 * v1 — isolated here so the policy can change without a schema change):
 *   - a completed `manager` review's rating is authoritative for that
 *     member+kpi+cycle;
 *   - otherwise, average the ratings from completed `peer` reviews;
 *   - `self` reviews are never folded into the official score.
 * Called transactionally whenever a Review transitions to `completed`.
 */
export async function recomputeMemberKpiScores(
  tx: Tx,
  args: { memberId: string; cycleId: string },
): Promise<void> {
  const { memberId, cycleId } = args;

  const completedReviews = await tx.review.findMany({
    where: {
      revieweeId: memberId,
      cycleId,
      status: "completed",
      type: { in: ["manager", "peer"] as ReviewType[] },
    },
    include: { kpiScores: true },
  });

  const managerReview = completedReviews.find((r) => r.type === "manager");
  const peerReviews = completedReviews.filter((r) => r.type === "peer");

  const byKpi = new Map<string, { sum: number; count: number }>();

  const source = managerReview ? [managerReview] : peerReviews;
  for (const review of source) {
    for (const line of review.kpiScores) {
      const entry = byKpi.get(line.kpiId) ?? { sum: 0, count: 0 };
      entry.sum += line.rating;
      entry.count += 1;
      byKpi.set(line.kpiId, entry);
    }
  }

  for (const [kpiId, { sum, count }] of byKpi) {
    const score = Math.round((sum / count) * 100) / 100;
    await tx.memberKpiScore.upsert({
      where: { memberId_kpiId_cycleId: { memberId, kpiId, cycleId } },
      create: { memberId, kpiId, cycleId, score, sourceCount: count },
      update: { score, sourceCount: count, computedAt: new Date() },
    });
  }
}

/**
 * Marks a review completed: recomputes its weighted overall score, persists
 * it, and rolls the result into MemberKpiScore — all inside one transaction
 * so the review, its score, and the fact table never disagree.
 */
export async function completeReview(reviewId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const review = await tx.review.update({
      where: { id: reviewId },
      data: { status: "completed", submittedAt: new Date() },
    });

    const overallScore = await computeWeightedOverallScore(tx, reviewId);
    await tx.review.update({
      where: { id: reviewId },
      data: { overallScore },
    });

    await recomputeMemberKpiScores(tx, {
      memberId: review.revieweeId,
      cycleId: review.cycleId,
    });
  });
}
