"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { findActiveCycle } from "@/lib/cycles";
import { logActivity } from "@/lib/audit";
import { closeReviewCycleSchema, startReviewCycleSchema } from "@/lib/validation/cycles.schema";

/**
 * Opens a review cycle and generates review shells for every member in
 * scope: a self-review (reviewer = the member) and, where a manager is on
 * file, a manager review. Peer reviews are added afterwards via
 * actions/reviews.ts's assignReviewer, once the cycle exists.
 */
export const startReviewCycle = authActionClient
  .schema(startReviewCycleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);
    if (parsedInput.departmentId) {
      await requireScopeAccess(actor, { departmentId: parsedInput.departmentId });
    } else if (actor.authRole !== "admin") {
      throw new Error("Only an admin can start an organization-wide cycle.");
    }

    // Match the exact scope the dashboard itself uses to resolve "the"
    // active cycle (see hod-dashboard's cycleScopeWhere) — without this,
    // starting a new cycle while one is already active silently creates two
    // concurrent "in_progress" cycles, which every page's "find the active
    // cycle" query then resolves inconsistently.
    const existingActive = await findActiveCycle(actor);
    if (existingActive) {
      throw new Error(`${existingActive.label} is already in progress. Close it before starting a new cycle.`);
    }

    const cycle = await prisma.reviewCycle.create({
      data: {
        orgId: actor.orgId,
        label: parsedInput.label,
        departmentId: parsedInput.departmentId ?? null,
        status: "in_progress",
        startDate: new Date(parsedInput.startDate),
        endDate: new Date(parsedInput.endDate),
      },
    });

    const members = await prisma.member.findMany({
      where: {
        orgId: actor.orgId,
        ...(parsedInput.departmentId ? { departmentId: parsedInput.departmentId } : {}),
      },
      select: { id: true, managerId: true },
    });

    const selfReviews = members.map((m) => ({
      cycleId: cycle.id,
      revieweeId: m.id,
      reviewerId: m.id,
      type: "self" as const,
      status: "pending" as const,
    }));

    const managerReviews = members
      .filter((m) => m.managerId)
      .map((m) => ({
        cycleId: cycle.id,
        revieweeId: m.id,
        reviewerId: m.managerId as string,
        type: "manager" as const,
        status: "pending" as const,
      }));

    await prisma.review.createMany({ data: [...selfReviews, ...managerReviews], skipDuplicates: true });

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb: "started a review cycle",
      targetType: "ReviewCycle",
      targetId: cycle.id,
      metadata: { label: cycle.label },
    });

    revalidatePath("/reviews");
    revalidatePath("/hod-dashboard");
    revalidatePath("/my-dashboard");

    return { cycleId: cycle.id };
  });

/**
 * Closes an active review cycle so a new one can be started in its scope.
 * Doesn't touch its reviews/scores — they stay exactly as they are, just
 * frozen under a "closed" cycle for history (see the Reviews/Analytics
 * pages, which already read closed cycles for trend history).
 */
export const closeReviewCycle = authActionClient
  .schema(closeReviewCycleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const cycle = await prisma.reviewCycle.findUnique({ where: { id: parsedInput.cycleId } });
    if (!cycle || cycle.orgId !== actor.orgId) throw new Error("Cycle not found.");
    await requireScopeAccess(actor, { departmentId: cycle.departmentId ?? undefined });
    if (cycle.status !== "in_progress") throw new Error("This cycle isn't in progress.");

    await prisma.reviewCycle.update({ where: { id: cycle.id }, data: { status: "closed" } });

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb: "closed a review cycle",
      targetType: "ReviewCycle",
      targetId: cycle.id,
      metadata: { label: cycle.label },
    });

    revalidatePath("/reviews");
    revalidatePath("/hod-dashboard");
    revalidatePath("/my-dashboard");
    revalidatePath("/analytics");
    revalidatePath("/kpis");
  });
