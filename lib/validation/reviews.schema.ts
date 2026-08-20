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
