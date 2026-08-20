import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter a team name." }).max(60),
  departmentId: z.string().min(1),
  leadMemberId: z.string().optional(),
});
