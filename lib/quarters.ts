import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Quarters and the three monthly cycles beneath them.
 *
 * The shape of the review calendar, in one place:
 *   - a quarter is Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec
 *   - each quarter holds exactly three monthly ReviewCycles
 *   - KPIs hang off the QUARTER, so one set of targets and weights covers
 *     all three months rather than being re-entered monthly
 *   - a quarter's score is the average of its months (see quarterScore), not
 *     a separately-collected review
 *
 * Every date here is computed in UTC. Local-time month boundaries would put
 * "1 July" an hour either side of the month depending on the server's zone,
 * which silently files a review under the wrong cycle.
 */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** 1-12 -> 1-4. Q1 = Jan-Mar. */
export function quarterIndexForMonth(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

/** The three month numbers (1-12) belonging to a quarter. */
export function monthsInQuarter(index: number): number[] {
  const first = (index - 1) * 3 + 1;
  return [first, first + 1, first + 2];
}

/** e.g. "July 2026" */
export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** e.g. "Q3 2026" */
export function quarterLabel(year: number, index: number): string {
  return `Q${index} ${year}`;
}

/** First instant of a month, and the last instant of its final day. */
export function monthBounds(year: number, month: number): { startDate: Date; endDate: Date } {
  return {
    startDate: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    // Day 0 of the NEXT month is the last day of this one.
    endDate: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

export function quarterBounds(year: number, index: number): { startDate: Date; endDate: Date } {
  const months = monthsInQuarter(index);
  return {
    startDate: monthBounds(year, months[0]).startDate,
    endDate: monthBounds(year, months[2]).endDate,
  };
}

/** Year/month/quarter for a given instant, in UTC. */
export function periodFor(date: Date = new Date()): { year: number; month: number; quarterIndex: number } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return { year, month, quarterIndex: quarterIndexForMonth(month) };
}

/**
 * Who a quarter/cycle belongs to. Exactly one of these is set in practice:
 * a department, a single team that runs its own reviews, or neither for an
 * org-wide cycle.
 */
export interface CycleScopeTarget {
  departmentId?: string | null;
  teamId?: string | null;
}

/** Human label for a scope, for audit entries and error messages. */
export function scopeLabel(scope: CycleScopeTarget, names: { department?: string; team?: string }): string {
  if (scope.teamId) return names.team ?? "team";
  if (scope.departmentId) return names.department ?? "department";
  return "organization";
}

/**
 * Every scope that should have its own review calendar:
 *   - each department, and
 *   - each team explicitly flagged runsOwnCycles (a team whose department
 *     has no HOD, typically) -- whose members are then reviewed under the
 *     team's own cycle instead of their department's.
 */
export async function listCycleScopes(orgId: string): Promise<CycleScopeTarget[]> {
  const [departments, independentTeams] = await Promise.all([
    prisma.department.findMany({ where: { orgId }, select: { id: true } }),
    prisma.team.findMany({ where: { orgId, runsOwnCycles: true }, select: { id: true } }),
  ]);
  return [
    ...departments.map((d) => ({ departmentId: d.id, teamId: null })),
    ...independentTeams.map((t) => ({ teamId: t.id, departmentId: null })),
  ];
}

/** Members reviewed under a given scope. */
export function membersInScopeWhere(orgId: string, scope: CycleScopeTarget): Prisma.MemberWhereInput {
  if (scope.teamId) return { orgId, teamId: scope.teamId };
  if (scope.departmentId) {
    return {
      orgId,
      departmentId: scope.departmentId,
      // A member on a team that runs its own cycles is reviewed there, not
      // twice -- once under the team and again under its department.
      OR: [{ teamId: null }, { team: { runsOwnCycles: false } }],
    };
  }
  return { orgId };
}

/**
 * A quarter's score: the mean of its months' scores.
 *
 * Deliberately an average of MONTHS, not of every individual review in the
 * quarter. Those differ whenever the months have different numbers of
 * completed reviews -- a month where only two people were reviewed would
 * otherwise count for less than one where ten were, which is not what
 * "this quarter's performance" means to anyone reading it.
 *
 * Months with no completed reviews contribute nothing rather than a zero:
 * a month nobody reviewed is missing data, not a bad result.
 */
export function quarterScore(monthScores: (number | null)[]): number | null {
  const present = monthScores.filter((s): s is number => s != null && Number.isFinite(s));
  if (present.length === 0) return null;
  return present.reduce((sum, s) => sum + s, 0) / present.length;
}

/** How much of a quarter has been scored, for "2 of 3 months" style labels. */
export function quarterProgress(monthScores: (number | null)[]): { scored: number; total: number } {
  return {
    scored: monthScores.filter((s) => s != null && Number.isFinite(s)).length,
    total: 3,
  };
}
