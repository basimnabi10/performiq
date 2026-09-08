"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient, findAuthUserByEmail } from "@/lib/supabase/admin";
import { getAppBaseUrl } from "@/lib/app-url";
import { odooLookup, odooSuggestions } from "@/lib/integrations/odoo";
import { checkRateLimit, inviteRateLimit } from "@/lib/rateLimit";
import { logActivity } from "@/lib/audit";
import { inviteMemberSchema, lookupOdooEmployeeSchema, updateDesignationSchema } from "@/lib/validation/members.schema";

export const lookupOdooEmployee = authActionClient
  .schema(lookupOdooEmployeeSchema)
  .action(async ({ parsedInput, ctx }) => {
    requireRole(ctx.member, ["admin", "hod"]);
    const employee = await odooLookup(parsedInput.lookupTerm);
    if (!employee) throw new Error("No matching Odoo employee found.");
    return employee;
  });

export const listOdooSuggestions = authActionClient.action(async ({ ctx }) => {
  requireRole(ctx.member, ["admin", "hod"]);
  return odooSuggestions();
});

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

    // A Supabase auth account outlives its Member row (removal from the org,
    // or a data reset), so the same address can already be registered even
    // though nobody by that name exists in the app. Inviting then fails with
    // `email_exists` — which no amount of retrying fixes. Re-link that
    // account to the new member instead of dead-ending.
    let reusedExistingAccount = false;
    try {
      const supabaseAdmin = createSupabaseAdminClient();
      const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${await getAppBaseUrl()}/api/auth/callback`,
      });

      if (error?.code === "email_exists") {
        const authUser = await findAuthUserByEmail(supabaseAdmin, email);
        if (!authUser) {
          throw new Error(
            "That address is already registered but its account can't be found. Ask a Supabase admin to remove it, then invite again.",
          );
        }
        await prisma.member.update({
          where: { id: created.id },
          data: { authUserId: authUser.id, status: "active" },
        });
        reusedExistingAccount = true;
      } else if (error) {
        // Surface the real reason — the built-in email sender is rate
        // limited, and "please try again" sends people in circles.
        const rateLimited = error.status === 429 || /rate limit/i.test(error.message);
        throw new Error(
          rateLimited
            ? "Supabase's built-in email sender has hit its rate limit. Wait a few minutes, or configure SMTP to send invites reliably."
            : `Couldn't send the invite email: ${error.message}`,
        );
      }
    } catch (e) {
      // Don't leave an orphaned Member row the caller can't retry against.
      await prisma.member.delete({ where: { id: created.id } });
      throw e instanceof Error ? e : new Error("Couldn't send the invite email. Please try again.");
    }

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb: "invited",
      targetType: "Member",
      targetId: created.id,
      metadata: { name: created.name, team: team.name, source: extra.source, reusedExistingAccount },
    });

    revalidatePath("/members");
    revalidatePath(`/teams/${team.id}`);

    return {
      memberId: created.id,
      name: created.name,
      email: created.email,
      source: extra.source,
      reusedExistingAccount,
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
