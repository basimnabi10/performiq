import { z } from "zod";

export const createKpiSchema = z.object({
  cycleId: z.string().min(1),
  name: z.string().trim().min(2, { error: "Enter a KPI name." }).max(80),
  description: z.string().trim().max(500).optional(),
  metricType: z.enum(["number", "percentage", "rating", "currency", "days"]),
  direction: z.enum(["higher_is_better", "lower_is_better"]).default("higher_is_better"),
  targetValue: z.string().trim().min(1, { error: "Enter a target." }),
  unit: z.string().trim().max(20).optional(),
  cadence: z.enum(["weekly", "monthly", "quarterly"]).default("quarterly"),
  teamWeights: z
    .array(
      z.object({
        teamId: z.string().min(1),
        weightPct: z.number().int().min(1).max(100),
      }),
    )
    .min(1, { error: "Apply this KPI to at least one team." }),
});

export const updateKpiTeamWeightSchema = z.object({
  kpiTeamId: z.string().min(1),
  weightPct: z.number().int().min(1).max(100),
});

// Single-team KPI creation with inline weight-budget editing (the team KPI
// tab's richer modal) — separate from createKpiSchema's multi-team flow so
// the weight-budget re-allocation can be committed atomically alongside the
// new KPI in one transaction.
export const createTeamKpiSchema = z.object({
  cycleId: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().trim().min(2, { error: "Enter a KPI name." }).max(80),
  detail: z.string().trim().max(200).optional(),
  metricType: z.enum(["number", "percentage", "rating", "days"]),
  direction: z.enum(["higher_is_better", "lower_is_better"]).default("higher_is_better"),
  targetValue: z.string().trim().min(1, { error: "Enter a target." }),
  unit: z.string().trim().max(20).optional(),
  weightPct: z.number().int().min(1).max(100),
  weightEdits: z
    .array(z.object({ kpiTeamId: z.string().min(1), weightPct: z.number().int().min(0).max(100) }))
    .default([]),
});
