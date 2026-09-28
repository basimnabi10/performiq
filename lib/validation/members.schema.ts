import { z } from "zod";

/**
 * Roles an invite can grant. The AuthRole enum also has `hod` and `manager`,
 * which the authorization layer still understands, but they aren't offered
 * yet — the product currently runs on two: admins who manage the org, and
 * team members who are reviewed. Granting `admin` is additionally restricted
 * to admins in the action itself (a non-admin must not be able to mint one).
 */
export const invitableRoles = ["admin", "hod", "hr", "ic"] as const;

export const inviteMemberSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("manual"),
    teamIds: z.array(z.string().min(1)).min(1, { error: "Choose at least one team." }),
    email: z.email({ error: "Enter a valid email address." }),
    authRole: z.enum(invitableRoles).default("ic"),
  }),
  z.object({
    mode: z.literal("odoo"),
    teamIds: z.array(z.string().min(1)).min(1, { error: "Choose at least one team." }),
    lookupTerm: z.string().min(1, { error: "Enter an email or employee ID." }),
    authRole: z.enum(invitableRoles).default("ic"),
  }),
]);

export const lookupOdooEmployeeSchema = z.object({
  lookupTerm: z.string().min(1, { error: "Enter an email or employee ID." }),
});

export const updateDesignationSchema = z.object({
  memberId: z.string().min(1),
  jobTitle: z.string().trim().min(2, { error: "Enter a title." }).max(80),
});

/** Changing what someone can do, after they were invited. */
export const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1),
  authRole: z.enum(invitableRoles),
});

export const removeMemberSchema = z.object({
  memberId: z.string().min(1),
});
