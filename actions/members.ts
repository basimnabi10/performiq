"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { AuthzError, requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient, findAuthUserByEmail } from "@/lib/supabase/admin";
import { getAppBaseUrl } from "@/lib/app-url";
import { findActiveCycleForDepartment } from "@/lib/cycles";
import { odooLookup, odooSuggestions } from "@/lib/integrations/odoo";
import { checkRateLimit, inviteRateLimit } from "@/lib/rateLimit";
import { logActivity } from "@/lib/audit";
import {
  inviteMemberSchema,
  lookupOdooEmployeeSchema,
  removeMemberSchema,
  updateMemberRoleSchema,
  updateDesignationSchema,
} from "@/lib/validation/members.schema";

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

    const teams = await prisma.team.findMany({ where: { id: { in: parsedInput.teamIds } } });
    if (teams.length !== parsedInput.teamIds.length) throw new Error("Team not found.");
    for (const t of teams) await requireScopeAccess(actor, { teamId: t.id });

    // What a person can reach is read from their single departmentId, so a
    // head of several teams only works while those teams share a department.
    // Saying so here beats handing someone a role that silently covers half
    // of what they were told it would.
    const departments = [...new Set(teams.map((t) => t.departmentId))];
    if (departments.length > 1) {
      throw new Error(
        "Those teams are in different departments. A head of department is scoped to one department, so pick teams from a single one.",
      );
    }
    if (parsedInput.authRole !== "hod" && teams.length > 1) {
      throw new Error("Only a head of department can be given more than one team.");
    }

    // An admin works across the organization and HR reads all of it, so
    // neither belongs to a team. Everyone else has to be somewhere: a member
    // with no team has no cycle, no KPIs and nobody to review them.
    const teamless = parsedInput.authRole === "admin" || parsedInput.authRole === "hr";
    if (!teamless && teams.length === 0) {
      throw new Error("Choose the team they join.");
    }
    const team = teamless ? null : teams[0];

    // Only an admin can create another admin — otherwise anyone who can
    // invite could grant themselves a colleague with full org access.
    const privileged = ["admin", "hod", "hr"];
    if (privileged.includes(parsedInput.authRole) && actor.authRole !== "admin") {
      throw new AuthzError("Only an admin can invite another admin.");
    }

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
        teamId: team?.id ?? null,
        departmentId: team?.departmentId ?? null,
        status: "invited",
        authRole: parsedInput.authRole,
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
        redirectTo: `${await getAppBaseUrl()}/accept`,
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

    // Cycle shells are generated once, when a cycle starts — so without this
    // anyone invited mid-cycle has no review to fill in and no way to be
    // reviewed until the next cycle begins.
    // Being head of a team is recorded on the team, so the org chart says who
    // runs what. Access still comes from the department — this is the record,
    // not the permission.
    if (parsedInput.authRole === "hod" && team) {
      await prisma.team.updateMany({
        where: { id: { in: parsedInput.teamIds } },
        data: { leadMemberId: created.id },
      });
      await prisma.department.updateMany({
        where: { id: team.departmentId, headMemberId: null },
        data: { headMemberId: created.id },
      });
    }

    const activeCycle = team ? await findActiveCycleForDepartment(actor.orgId, team.departmentId) : null;
    if (activeCycle) {
      await prisma.review.createMany({
        data: [
          ...(created.managerId
            ? [
                {
                  cycleId: activeCycle.id,
                  revieweeId: created.id,
                  reviewerId: created.managerId,
                  type: "manager" as const,
                  status: "pending" as const,
                },
              ]
            : []),
        ],
        skipDuplicates: true,
      });
    }

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb: "invited",
      targetType: "Member",
      targetId: created.id,
      metadata: { name: created.name, team: team?.name ?? null, source: extra.source, role: parsedInput.authRole, reusedExistingAccount },
    });

    revalidatePath("/members");
    if (team) revalidatePath(`/teams/${team.id}`);

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

/**
 * Permanently removes someone from the organization.
 *
 * A Member is referenced by fifteen relations and none of them cascade, so
 * this has to be explicit about which data belongs to the person and which
 * belongs to the org:
 *   - Reassigned, never deleted: KPIs and courses they authored, and the
 *     "assigned by" on learning they handed out. Losing a team's KPIs because
 *     the admin who wrote them left would be data loss, not cleanup.
 *   - Nulled: their team-lead / department-head posts, and the manager link
 *     on anyone reporting to them.
 *   - Deleted: their own reviews (given and received), scores, learning
 *     progress, mood check-ins, lesson requests and audit entries.
 * Their Supabase auth account goes too, so removal actually revokes access.
 */
export const removeMember = authActionClient
  .schema(removeMemberSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin"]);

    const target = await prisma.member.findUnique({ where: { id: parsedInput.memberId } });
    if (!target || target.orgId !== actor.orgId) throw new Error("Member not found.");
    if (target.id === actor.id) throw new Error("You can't remove your own account.");

    if (target.authRole === "admin") {
      const admins = await prisma.member.count({ where: { orgId: actor.orgId, authRole: "admin" } });
      if (admins <= 1) throw new Error("This is the only admin — promote someone else first.");
    }

    const id = target.id;
    // Sixteen statements against a hosted database take well over Prisma's
    // default 5s interactive-transaction budget on round-trip latency alone
    // (measured ~6.3s from here), so the budget is raised rather than the
    // work split — this must stay all-or-nothing, or a failure part-way
    // leaves a member with their references reassigned but the row intact.
    // The array form of $transaction can't carry a timeout, only the
    // callback form can.
    await prisma.$transaction(
      async (tx) => {
        // Org-owned work changes hands rather than disappearing.
        await tx.kpi.updateMany({ where: { ownerId: id }, data: { ownerId: actor.id } });
        await tx.course.updateMany({ where: { ownerId: id }, data: { ownerId: actor.id } });
        await tx.learningAssignment.updateMany({ where: { assignedById: id }, data: { assignedById: actor.id } });

        // Posts and links that can simply be vacated.
        await tx.team.updateMany({ where: { leadMemberId: id }, data: { leadMemberId: null } });
        await tx.department.updateMany({ where: { headMemberId: id }, data: { headMemberId: null } });
        await tx.member.updateMany({ where: { managerId: id }, data: { managerId: null } });
        await tx.lessonRequest.updateMany({ where: { decidedById: id }, data: { decidedById: null } });

        // Their own records. ReviewKpiScore cascades from Review.
        await tx.review.deleteMany({ where: { OR: [{ revieweeId: id }, { reviewerId: id }] } });
        await tx.reviewAssignment.deleteMany({ where: { OR: [{ revieweeId: id }, { reviewerId: id }] } });
        await tx.reviewerGrant.deleteMany({
          where: { OR: [{ reviewerId: id }, { revieweeId: id }, { grantedById: id }] },
        });
        await tx.memberKpiScore.deleteMany({ where: { memberId: id } });
        await tx.learnerProgress.deleteMany({ where: { memberId: id } });
        await tx.learningAssignment.deleteMany({ where: { memberId: id } });
        await tx.lessonRequest.deleteMany({ where: { memberId: id } });
        await tx.moodCheckin.deleteMany({ where: { memberId: id } });
        await tx.auditLog.deleteMany({ where: { actorId: id } });

        await tx.member.delete({ where: { id } });
      },
      { timeout: 30_000, maxWait: 15_000 },
    );

    // Revoke the login too, so removal actually locks them out.
    if (target.authUserId) {
      try {
        await createSupabaseAdminClient().auth.admin.deleteUser(target.authUserId);
      } catch (e) {
        // The member row is already gone and any surviving session is caught
        // by the orphaned-session route, so this isn't worth failing over.
        console.error("Couldn't delete Supabase auth user for removed member:", e);
      }
    }

    revalidatePath("/members");
    revalidatePath("/teams");
    if (target.teamId) revalidatePath(`/teams/${target.teamId}`);

    return { name: target.name, email: target.email };
  });

/**
 * Changes what someone can do after they were invited.
 *
 * Admin-only, because every role above `ic` carries sight of other people's
 * reviews. Two things it refuses outright:
 *
 *  - Changing your own role. An admin who demotes themselves cannot undo it,
 *    and if they were the last admin nobody else can either.
 *  - Demoting the last admin. `removeMember` already refuses to delete one
 *    for the same reason; leaving by the other door would be the same
 *    lockout with a different name.
 *
 * A HOD is read against their department, so moving someone into that role
 * without one would hand them a working login and an empty application. That
 * is caught here rather than discovered later.
 */
export const updateMemberRole = authActionClient
  .schema(updateMemberRoleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin"]);

    const target = await prisma.member.findUnique({
      where: { id: parsedInput.memberId },
      select: { id: true, orgId: true, name: true, authRole: true, departmentId: true },
    });
    if (!target || target.orgId !== actor.orgId) throw new Error("Member not found.");

    if (target.id === actor.id) {
      throw new Error("You can't change your own role. Ask another admin to do it.");
    }

    if (target.authRole === parsedInput.authRole) {
      return { name: target.name, authRole: target.authRole };
    }

    if (target.authRole === "admin" && parsedInput.authRole !== "admin") {
      const admins = await prisma.member.count({ where: { orgId: actor.orgId, authRole: "admin" } });
      if (admins <= 1) throw new Error("This is the only admin — promote someone else first.");
    }

    if (parsedInput.authRole === "hod" && !target.departmentId) {
      throw new Error(
        `${target.name} isn't in a department yet, and a head of department is scoped to one. Put them on a team first.`,
      );
    }

    await prisma.member.update({
      where: { id: target.id },
      data: { authRole: parsedInput.authRole },
    });

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb: `changed ${target.name}'s role to ${parsedInput.authRole}`,
      targetType: "Member",
      targetId: target.id,
    });

    revalidatePath("/members");
    revalidatePath(`/members/${target.id}`);
    return { name: target.name, authRole: parsedInput.authRole };
  });
