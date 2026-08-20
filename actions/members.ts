"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { odooLookup } from "@/lib/integrations/odoo";
import { checkRateLimit, inviteRateLimit } from "@/lib/rateLimit";
import { logActivity } from "@/lib/audit";
import { inviteMemberSchema, updateDesignationSchema } from "@/lib/validation/members.schema";

export const inviteMember = authActionClient
  .schema(inviteMemberSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);
    await checkRateLimit(inviteRateLimit, actor.id);

    const team = await prisma.team.findUnique({ where: { id: parsedInput.teamId } });
    if (!team) throw new Error("Team not found.");
    await requireScopeAccess(actor, { teamId: team.id });

    let email: string;
    let extra: {
      name: string;
      jobTitle?: string;
      empId?: string;
      location?: string;
      phone?: string;
      joinedDate?: Date;
      workType?: string;
      source: "odoo" | "manual";
    };

    if (parsedInput.mode === "odoo") {
      const emp = await odooLookup(parsedInput.lookupTerm);
      if (!emp) throw new Error("No matching Odoo employee found.");
      email = emp.email;
      extra = {
        name: emp.name,
        jobTitle: emp.jobTitle,
        empId: emp.empId,
        location: emp.location,
        phone: emp.phone,
        joinedDate: new Date(emp.joinedDate),
        workType: emp.workType,
        source: "odoo",
      };
    } else {
      email = parsedInput.email;
      extra = { name: `Pending (${email})`, source: "manual" };
    }

    const existing = await prisma.member.findUnique({ where: { email } });
    if (existing) throw new Error("A member with this email already exists.");

    const created = await prisma.member.create({
      data: {
        orgId: actor.orgId,
        email,
        teamId: team.id,
        departmentId: team.departmentId,
        status: "invited",
        authRole: "ic",
        ...extra,
      },
    });

    try {
      const supabaseAdmin = createSupabaseAdminClient();
      const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      });
      if (error) throw new Error(error.message);
    } catch {
      // Don't leave an orphaned Member row the caller can't retry against.
      await prisma.member.delete({ where: { id: created.id } });
      throw new Error("Couldn't send the invite email. Please try again.");
    }

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb: "invited",
      targetType: "Member",
      targetId: created.id,
      metadata: { name: created.name, team: team.name, source: extra.source },
    });

    revalidatePath("/members");
    revalidatePath(`/teams/${team.id}`);

    return {
      memberId: created.id,
      name: created.name,
      email: created.email,
      source: extra.source,
    };
  });

export const updateDesignation = authActionClient
  .schema(updateDesignationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod", "manager"]);

    const target = await prisma.member.findUnique({
      where: { id: parsedInput.memberId },
      select: { teamId: true, departmentId: true },
    });
    if (!target) throw new Error("Member not found.");
    await requireScopeAccess(actor, { teamId: target.teamId, departmentId: target.departmentId });

    await prisma.member.update({
      where: { id: parsedInput.memberId },
      data: { jobTitle: parsedInput.jobTitle },
    });

    revalidatePath("/members");
    revalidatePath(`/members/${parsedInput.memberId}`);
  });
