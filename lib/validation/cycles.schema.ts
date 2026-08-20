import { z } from "zod";

export const startReviewCycleSchema = z.object({
  label: z.string().trim().min(2, { error: "Enter a cycle label, e.g. \"Q4 2026\"." }).max(40),
  departmentId: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});
