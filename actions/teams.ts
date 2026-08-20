"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createTeamSchema } from "@/lib/validation/teams.schema";

export const createTeam = authActionClient
  .schema(createTeamSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);
    await requireScopeAccess(actor, { departmentId: parsedInput.departmentId });

    const team = await prisma.team.create({
      data: {
        orgId: actor.orgId,
        departmentId: parsedInput.departmentId,
        name: parsedInput.name,
        leadMemberId: parsedInput.leadMemberId || null,
      },
    });

    revalidatePath("/teams");
    return { teamId: team.id };
  });
