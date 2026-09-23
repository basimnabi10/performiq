import { z } from "zod";

export const addCoachingNoteSchema = z.object({
  memberId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(2, { error: "Write a note first." })
    .max(4000, { error: "Keep a note under 4000 characters." }),
});

export const deleteCoachingNoteSchema = z.object({
  noteId: z.string().min(1),
});
