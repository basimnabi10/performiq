import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Which review cycles a given viewer can see, and which one counts as "the"
 * active cycle for them.
 *
 * A cycle is either org-wide (`departmentId: null`, started by an admin) or
 * scoped to one department (started by its HOD) — so a department's people
 * must see BOTH their own department's cycles and the org-wide ones. Every
 * page used to inline its own variant of this rule and they disagreed: the
 * team page matched org-wide cycles, while the KPI manager, Reviews and
 * Teams pages matched only `departmentId === actor.departmentId`. The
 * visible symptom was an admin-started org-wide cycle showing as active on
 * one page and "no active cycle — start one" on the next. Keep every caller
 * on these helpers rather than re-deriving the rule.
 */
export interface CycleScope {
  orgId: string;
  authRole: string;
  departmentId?: string | null;
}

/** Every cycle this viewer can see (any status) — for history/trends. */
export function cycleScopeWhere(scope: CycleScope): Prisma.ReviewCycleWhereInput {
  if (scope.authRole === "admin") return { orgId: scope.orgId };
  return {
    orgId: scope.orgId,
    OR: [{ departmentId: null }, ...(scope.departmentId ? [{ departmentId: scope.departmentId }] : [])],
  };
}

export function activeCycleWhere(scope: CycleScope): Prisma.ReviewCycleWhereInput {
  return { ...cycleScopeWhere(scope), status: "in_progress" };
}

export async function findActiveCycle(scope: CycleScope) {
  return prisma.reviewCycle.findFirst({ where: activeCycleWhere(scope), orderBy: { startDate: "desc" } });
}

/**
 * Same rule, but for a page scoped to someone else's department/team (a
 * member profile, a team detail page) rather than the viewer's own.
 */
export function departmentCycleWhere(orgId: string, departmentId: string | null): Prisma.ReviewCycleWhereInput {
  return {
    orgId,
    OR: [{ departmentId: null }, ...(departmentId ? [{ departmentId }] : [])],
  };
}

export async function findActiveCycleForDepartment(orgId: string, departmentId: string | null) {
  return prisma.reviewCycle.findFirst({
    where: { ...departmentCycleWhere(orgId, departmentId), status: "in_progress" },
    orderBy: { startDate: "desc" },
  });
}
