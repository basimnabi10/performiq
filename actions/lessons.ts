"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, lessonRequestRateLimit } from "@/lib/rateLimit";
import { logActivity } from "@/lib/audit";
import { decideLessonRequestSchema, submitLessonRequestSchema } from "@/lib/validation/lessons.schema";

export const submitLessonRequest = authActionClient
  .schema(submitLessonRequestSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    await checkRateLimit(lessonRequestRateLimit, actor.id);

    const request = await prisma.lessonRequest.create({
      data: { memberId: actor.id, topic: parsedInput.topic, why: parsedInput.why },
    });

    revalidatePath("/my-dashboard");
    revalidatePath("/hod-dashboard");
    return { requestId: request.id };
  });

export const decideLessonRequest = authActionClient
  .schema(decideLessonRequestSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const request = await prisma.lessonRequest.findUnique({
      where: { id: parsedInput.requestId },
      include: { member: { select: { departmentId: true } } },
    });
    if (!request) throw new Error("Request not found.");
    await requireScopeAccess(actor, { departmentId: request.member.departmentId });

    await prisma.lessonRequest.update({
      where: { id: parsedInput.requestId },
      data: { status: parsedInput.decision, decidedById: actor.id, decidedAt: new Date() },
    });

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb: parsedInput.decision === "approved" ? "approved a lesson request" : "declined a lesson request",
      targetType: "LessonRequest",
      targetId: request.id,
      metadata: { topic: request.topic },
    });

    revalidatePath("/hod-dashboard");
    revalidatePath("/my-dashboard");
  });
