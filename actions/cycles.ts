"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { openCycle } from "@/lib/cycle-open";
import { monthLabel, monthsInQuarter } from "@/lib/quarters";
import { logActivity } from "@/lib/audit";
import {
  closeReviewCycleSchema,
  openCycleSchema,
  reopenReviewCycleSchema,
} from "@/lib/validation/cycles.schema";

function revalidateCyclePages() {
  revalidatePath("/reviews");
  revalidatePath("/hod-dashboard");
  revalidatePath("/my-dashboard");
  revalidatePath("/analytics");
  revalidatePath("/kpis");
}

/**
 * Manually opens a month for one scope.
 *
 * Months normally open by themselves on the 1st, so this is the catch-up
 * path: a department created mid-month, a team newly switched to running its
 * own cycles, or a scheduled run that did not fire. Opening a month that is
 * already open is not an error — it just reports that nothing was needed.
 */
export const openReviewCycle = authActionClient
  .schema(openCycleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const scope = {
      departmentId: parsedInput.departmentId ?? null,
      teamId: parsedInput.teamId ?? null,
    };

    if (scope.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: scope.teamId },
        select: { orgId: true, departmentId: true, runsOwnCycles: true },
      });
      if (!team || team.orgId !== actor.orgId) throw new Error("Team not found.");
      if (!team.runsOwnCycles) {
        throw new Error(
          "This team is reviewed under its department. Turn on its own review cycles first if it should run separately.",
        );
      }
      await requireScopeAccess(actor, { teamId: scope.teamId, departmentId: team.departmentId });
    } else if (scope.departmentId) {
      await requireScopeAccess(actor, { departmentId: scope.departmentId });
    } else if (actor.authRole !== "admin") {
      throw new Error("Only an admin can open an organization-wide cycle.");
    }

    const result = await openCycle(actor.orgId, scope, parsedInput.year, parsedInput.month);
    const label = monthLabel(parsedInput.year, parsedInput.month);

    if (!result.created) {
      return { cycleId: result.cycleId, created: false, message: `${label} is already open.` };
    }

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb: "opened a review cycle",
      targetType: "ReviewCycle",
      targetId: result.cycleId,
      metadata: { label, reviewsCreated: result.reviewsCreated },
    });

    revalidateCyclePages();
    return { cycleId: result.cycleId, created: true, message: `${label} is open.` };
  });

/**
 * Closes a month. Months stay open until someone closes them deliberately —
 * an unfinished review is a reason to chase a manager, not to silently seal
 * the month with gaps in it.
 *
 * Closing the third month of a quarter closes the quarter too, which is what
 * finalises its score (the average of its months).
 */
export const closeReviewCycle = authActionClient
  .schema(closeReviewCycleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const cycle = await prisma.reviewCycle.findUnique({
      where: { id: parsedInput.cycleId },
      include: { quarter: true },
    });
    if (!cycle || cycle.orgId !== actor.orgId) throw new Error("Cycle not found.");
    await requireScopeAccess(actor, {
      departmentId: cycle.departmentId ?? undefined,
      teamId: cycle.teamId ?? undefined,
    });
    if (cycle.status !== "in_progress") throw new Error("This cycle isn't in progress.");

    await prisma.reviewCycle.update({ where: { id: cycle.id }, data: { status: "closed" } });

    // A quarter is done when all three of its months are — nothing else
    // needs collecting, since its score is the average of those months.
    if (cycle.quarterId) {
      const siblings = await prisma.reviewCycle.findMany({
        where: { quarterId: cycle.quarterId },
        select: { month: true, status: true },
      });
      const expected = cycle.quarter ? monthsInQuarter(cycle.quarter.index) : [];
      const allPresent = expected.every((m) => siblings.some((s) => s.month === m));
      const allClosed = siblings.every((s) => s.status === "closed");
      if (allPresent && allClosed) {
        await prisma.quarter.update({ where: { id: cycle.quarterId }, data: { status: "closed" } });
      }
    }

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb: "closed a review cycle",
      targetType: "ReviewCycle",
      targetId: cycle.id,
      metadata: { label: cycle.label },
    });

    revalidateCyclePages();
  });

/**
 * Reopens a closed month. Closing is a judgement call someone can get wrong —
 * without this, a month closed a week early can never take the reviews it was
 * still waiting on.
 */
export const reopenReviewCycle = authActionClient
  .schema(reopenReviewCycleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin"]);

    const cycle = await prisma.reviewCycle.findUnique({ where: { id: parsedInput.cycleId } });
    if (!cycle || cycle.orgId !== actor.orgId) throw new Error("Cycle not found.");
    if (cycle.status !== "closed") throw new Error("This cycle isn't closed.");

    await prisma.reviewCycle.update({ where: { id: cycle.id }, data: { status: "in_progress" } });
    if (cycle.quarterId) {
      await prisma.quarter.update({ where: { id: cycle.quarterId }, data: { status: "in_progress" } });
    }

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb: "reopened a review cycle",
      targetType: "ReviewCycle",
      targetId: cycle.id,
      metadata: { label: cycle.label },
    });

    revalidateCyclePages();
  });
