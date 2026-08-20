"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { startReviewCycleSchema } from "@/lib/validation/cycles.schema";

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

    revalidatePath("/reviews");
    revalidatePath("/hod-dashboard");
    revalidatePath("/my-dashboard");

    return { cycleId: cycle.id };
  });
