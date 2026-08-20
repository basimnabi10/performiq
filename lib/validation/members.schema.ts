import { z } from "zod";

export const inviteMemberSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("manual"),
    teamId: z.string().min(1),
    email: z.email({ error: "Enter a valid email address." }),
  }),
  z.object({
    mode: z.literal("odoo"),
    teamId: z.string().min(1),
    lookupTerm: z.string().min(1, { error: "Enter an email or employee ID." }),
  }),
]);

export const updateDesignationSchema = z.object({
  memberId: z.string().min(1),
  jobTitle: z.string().trim().min(2, { error: "Enter a title." }).max(80),
});
