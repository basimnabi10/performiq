import { z } from "zod";

export const submitMoodSchema = z.object({
  value: z.number().int().min(1).max(5),
  reason: z.string().trim().max(300).optional(),
});
