import { z } from "zod";

const kpiScoreInput = z.object({
  kpiId: z.string().min(1),
  rating: z.number().int().min(1, { error: "Rate 1-5." }).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const saveReviewSchema = z.object({
  reviewId: z.string().min(1),
  kpiScores: z.array(kpiScoreInput).min(1, { error: "Score at least one KPI." }),
});

export const assignReviewerSchema = z.object({
  cycleId: z.string().min(1),
  revieweeId: z.string().min(1),
  reviewerId: z.string().min(1),
});

export const startReviewSchema = z.object({
  cycleId: z.string().min(1),
  revieweeId: z.string().min(1),
  reviewerId: z.string().min(1),
  type: z.enum(["self", "manager", "peer"]),
});

/** Opening (or creating) the review the current person owes a team member. */
export const openMemberReviewSchema = z.object({
  memberId: z.string().min(1),
  cycleId: z.string().min(1),
});

/** The reviewee's reply to a completed review of them. */
export const respondToReviewSchema = z.object({
  reviewId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(2, { error: "Write a reply first." })
    .max(2000, { error: "Keep a reply under 2000 characters." }),
});
