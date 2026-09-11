import { z } from "zod";

/**
 * Opening a month is normally automatic (see app/api/cron/open-cycles), so
 * this is the manual catch-up path: pick a scope, and the year/month decide
 * the label, the dates and which quarter it belongs to. Nothing here is
 * free text any more — a cycle called "ABC" running from September to
 * November was exactly how the old model let the calendar drift.
 */
export const openCycleSchema = z.object({
  departmentId: z.string().optional(),
  teamId: z.string().optional(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export const closeReviewCycleSchema = z.object({
  cycleId: z.string().min(1),
});

/** Reopening a month an admin closed too early. */
export const reopenReviewCycleSchema = z.object({
  cycleId: z.string().min(1),
});
