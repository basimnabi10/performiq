import { z } from "zod";

export const submitLessonRequestSchema = z.object({
  topic: z.string().trim().min(2, { error: "Enter a topic." }).max(100),
  why: z.string().trim().max(500).optional(),
});

export const decideLessonRequestSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["approved", "declined"]),
});
