import "server-only";

import { prisma } from "@/lib/prisma";
import {
  type CycleScopeTarget,
  listCycleScopes,
  membersInScopeWhere,
  monthBounds,
  monthLabel,
  periodFor,
  quarterBounds,
  quarterIndexForMonth,
} from "@/lib/quarters";

/**
 * Opening the review calendar: quarters, their monthly cycles, and the
 * review shells inside them.
 *
 * Cycles are opened automatically on the 1st (see app/api/cron/open-cycles)
 * rather than by someone remembering to click a button. Everything here is
 * therefore written to be safely repeatable: running it twice in a month
 * must not create a second cycle or a duplicate review, because a retried
 * cron run, a manual trigger and a deploy-time call can all overlap.
 */

/** Finds or creates the quarter that owns a given month, for one scope. */
export async function ensureQuarter(orgId: string, scope: CycleScopeTarget, year: number, month: number) {
  const index = quarterIndexForMonth(month);
  const existing = await prisma.quarter.findFirst({
    where: {
      orgId,
      year,
      index,
      departmentId: scope.departmentId ?? null,
      teamId: scope.teamId ?? null,
    },
  });
  if (existing) return existing;

  const { startDate, endDate } = quarterBounds(year, index);
  return prisma.quarter.create({
    data: {
      orgId,
      year,
      index,
      departmentId: scope.departmentId ?? null,
      teamId: scope.teamId ?? null,
      status: "in_progress",
      startDate,
      endDate,
    },
  });
}

export interface OpenCycleResult {
  cycleId: string;
  created: boolean;
  reviewsCreated: number;
}

/**
 * Opens one month for one scope, creating the quarter if needed, and
 * generates the review shells: a self-review for every member in scope, plus
 * a manager review wherever a manager is on file.
 *
 * Returns `created: false` when the cycle already existed -- the caller can
 * treat that as success, not an error, since that is the normal outcome of a
 * repeated run.
 */
export async function openCycle(
  orgId: string,
  scope: CycleScopeTarget,
  year: number,
  month: number,
): Promise<OpenCycleResult> {
  const existing = await prisma.reviewCycle.findFirst({
    where: {
      orgId,
      year,
      month,
      departmentId: scope.departmentId ?? null,
      teamId: scope.teamId ?? null,
    },
  });
  if (existing) return { cycleId: existing.id, created: false, reviewsCreated: 0 };

  const quarter = await ensureQuarter(orgId, scope, year, month);
  const { startDate, endDate } = monthBounds(year, month);

  const cycle = await prisma.reviewCycle.create({
    data: {
      orgId,
      quarterId: quarter.id,
      label: monthLabel(year, month),
      year,
      month,
      departmentId: scope.departmentId ?? null,
      teamId: scope.teamId ?? null,
      status: "in_progress",
      startDate,
      endDate,
    },
  });

  const reviewsCreated = await createReviewShells(orgId, cycle.id, scope);
  return { cycleId: cycle.id, created: true, reviewsCreated };
}

/**
 * Review shells for everyone in scope. Also used when someone joins
 * mid-cycle, so a new starter is not invisible until the next month.
 */
export async function createReviewShells(
  orgId: string,
  cycleId: string,
  scope: CycleScopeTarget,
): Promise<number> {
  const members = await prisma.member.findMany({
    where: membersInScopeWhere(orgId, scope),
    select: { id: true, managerId: true },
  });

  const selfReviews = members.map((m) => ({
    cycleId,
    revieweeId: m.id,
    reviewerId: m.id,
    type: "self" as const,
    status: "pending" as const,
  }));

  const managerReviews = members
    .filter((m) => m.managerId)
    .map((m) => ({
      cycleId,
      revieweeId: m.id,
      reviewerId: m.managerId as string,
      type: "manager" as const,
      status: "pending" as const,
    }));

  const { count } = await prisma.review.createMany({
    data: [...selfReviews, ...managerReviews],
    skipDuplicates: true,
  });
  return count;
}

export interface OpenCurrentCyclesResult {
  year: number;
  month: number;
  opened: { scope: CycleScopeTarget; cycleId: string; reviewsCreated: number }[];
  alreadyOpen: number;
}

/**
 * Opens the current month for every scope that should have one. This is what
 * the scheduled job calls; it is safe to run on any day, so a missed or
 * retried run still lands the month rather than skipping it entirely.
 */
export async function openCurrentCycles(orgId: string, now: Date = new Date()): Promise<OpenCurrentCyclesResult> {
  const { year, month } = periodFor(now);
  const scopes = await listCycleScopes(orgId);

  const opened: OpenCurrentCyclesResult["opened"] = [];
  let alreadyOpen = 0;

  for (const scope of scopes) {
    const result = await openCycle(orgId, scope, year, month);
    if (result.created) {
      opened.push({ scope, cycleId: result.cycleId, reviewsCreated: result.reviewsCreated });
    } else {
      alreadyOpen += 1;
    }
  }

  return { year, month, opened, alreadyOpen };
}

export interface CloseElapsedResult {
  closed: { cycleId: string; label: string }[];
  quartersClosed: string[];
}

/**
 * Closes every month whose period has passed, and any quarter whose three
 * months are all closed. Called by the same daily job that opens months, so
 * the calendar advances with no one pressing anything.
 *
 * "Closed" here marks the month as no longer current -- it does NOT lock the
 * reviews inside it. A reviewer can still submit a late review for a closed
 * month (see assertCanEditReview), which is why a past month's score, and
 * the quarter average built from it, can still move after the fact.
 */
export async function closeElapsedCycles(orgId: string, now: Date = new Date()): Promise<CloseElapsedResult> {
  const { year, month } = periodFor(now);

  const elapsed = await prisma.reviewCycle.findMany({
    where: {
      orgId,
      status: "in_progress",
      // Anything before the current month: an earlier year, or an earlier
      // month within this year.
      OR: [{ year: { lt: year } }, { year, month: { lt: month } }],
    },
    select: { id: true, label: true, quarterId: true },
  });

  if (elapsed.length === 0) return { closed: [], quartersClosed: [] };

  await prisma.reviewCycle.updateMany({
    where: { id: { in: elapsed.map((c) => c.id) } },
    data: { status: "closed" },
  });

  // A quarter is done once all three of its months are.
  const quarterIds = [...new Set(elapsed.map((c) => c.quarterId).filter((id): id is string => id != null))];
  const quartersClosed: string[] = [];
  for (const quarterId of quarterIds) {
    const siblings = await prisma.reviewCycle.findMany({
      where: { quarterId },
      select: { status: true },
    });
    if (siblings.length === 3 && siblings.every((s) => s.status === "closed")) {
      await prisma.quarter.update({ where: { id: quarterId }, data: { status: "closed" } });
      quartersClosed.push(quarterId);
    }
  }

  return {
    closed: elapsed.map((c) => ({ cycleId: c.id, label: c.label })),
    quartersClosed,
  };
}
