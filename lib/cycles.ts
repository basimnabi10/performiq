import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Which review cycles a given viewer can see, and which one counts as "the"
 * active cycle for them.
 *
 * A cycle belongs to one scope: a department (the usual case), a single team
 * that runs its own reviews, or the whole org. Someone must therefore see
 * their department's cycles AND their team's own ones AND org-wide ones.
 * Every page used to inline its own variant of this rule and they disagreed:
 * the team page matched org-wide cycles, while the KPI manager, Reviews and
 * Teams pages matched only `departmentId === actor.departmentId`. The
 * visible symptom was an admin-started org-wide cycle showing as active on
 * one page and "no active cycle — start one" on the next. Keep every caller
 * on these helpers rather than re-deriving the rule.
 */
export interface CycleScope {
  orgId: string;
  authRole: string;
  departmentId?: string | null;
  teamId?: string | null;
}

/** Every cycle this viewer can see (any status) — for history/trends. */
export function cycleScopeWhere(scope: CycleScope): Prisma.ReviewCycleWhereInput {
  if (scope.authRole === "admin") return { orgId: scope.orgId };
  return {
    orgId: scope.orgId,
    OR: [
      { departmentId: null, teamId: null },
      ...(scope.departmentId ? [{ departmentId: scope.departmentId }] : []),
      ...(scope.teamId ? [{ teamId: scope.teamId }] : []),
    ],
  };
}

export function activeCycleWhere(scope: CycleScope): Prisma.ReviewCycleWhereInput {
  return { ...cycleScopeWhere(scope), status: "in_progress" as const };
}

/**
 * The cycle a viewer is currently working in. Ordered by period rather than
 * creation time so a month opened late (a catch-up run) still sorts into its
 * real place in the calendar.
 */
export async function findActiveCycle(scope: CycleScope) {
  return prisma.reviewCycle.findFirst({
    where: activeCycleWhere(scope),
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

/**
 * Same rule, but for a page scoped to someone else's department/team (a
 * member profile, a team detail page) rather than the viewer's own.
 */
export function departmentCycleWhere(
  orgId: string,
  departmentId: string | null,
  teamId?: string | null,
): Prisma.ReviewCycleWhereInput {
  return {
    orgId,
    OR: [
      { departmentId: null, teamId: null },
      ...(departmentId ? [{ departmentId }] : []),
      ...(teamId ? [{ teamId }] : []),
    ],
  };
}

export async function findActiveCycleForDepartment(
  orgId: string,
  departmentId: string | null,
  teamId?: string | null,
) {
  return prisma.reviewCycle.findFirst({
    where: { ...departmentCycleWhere(orgId, departmentId, teamId), status: "in_progress" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

/** Quarters visible to a viewer, same scoping rule as cycles. */
export function quarterScopeWhere(scope: CycleScope): Prisma.QuarterWhereInput {
  if (scope.authRole === "admin") return { orgId: scope.orgId };
  return {
    orgId: scope.orgId,
    OR: [
      { departmentId: null, teamId: null },
      ...(scope.departmentId ? [{ departmentId: scope.departmentId }] : []),
      ...(scope.teamId ? [{ teamId: scope.teamId }] : []),
    ],
  };
}

/** The quarter a viewer is currently in, if one is open. */
export async function findActiveQuarter(scope: CycleScope) {
  return prisma.quarter.findFirst({
    where: { ...quarterScopeWhere(scope), status: "in_progress" },
    orderBy: [{ year: "desc" }, { index: "desc" }],
  });
}
