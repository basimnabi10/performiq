"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createDepartmentSchema, renameDepartmentSchema, updateOrganizationSchema } from "@/lib/validation/organization.schema";

export const updateOrganization = authActionClient
  .schema(updateOrganizationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin"]);

    await prisma.organization.update({
      where: { id: actor.orgId },
      data: { name: parsedInput.name },
    });

    revalidatePath("/settings");
    revalidatePath("/", "layout");
  });

export const createDepartment = authActionClient
  .schema(createDepartmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin"]);

    const department = await prisma.department.create({
      data: { orgId: actor.orgId, name: parsedInput.name },
    });

    revalidatePath("/settings");
    return { departmentId: department.id };
  });

export const renameDepartment = authActionClient
  .schema(renameDepartmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin"]);

    const department = await prisma.department.findFirst({
      where: { id: parsedInput.departmentId, orgId: actor.orgId },
    });
    if (!department) throw new Error("Department not found.");

    await prisma.department.update({
      where: { id: department.id },
      data: { name: parsedInput.name },
    });

    revalidatePath("/settings");
    revalidatePath("/", "layout");
  });
