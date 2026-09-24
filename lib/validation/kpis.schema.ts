import { z } from "zod";

export const createKpiSchema = z.object({
  quarterId: z.string().min(1),
  name: z.string().trim().min(2, { error: "Enter a KPI name." }).max(80),
  description: z.string().trim().max(500).optional(),
  categoryId: z.string().optional(),
  rubric: z.string().trim().max(2000).optional(),
  lifecycle: z.enum(["draft", "active"]).default("active"),
  /** Publish to the organization KPI library so other teams can adopt it. */
  shareable: z.boolean().default(false),
  /** Other KPI weights the wizard rebalanced, saved in the same write. */
  weightEdits: z
    .array(z.object({ kpiTeamId: z.string().min(1), weightPct: z.number().int().min(0).max(100) }))
    .default([]),
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

// Records the KPI's actual measured value for this cycle, in the KPI's own
// real-world unit. An empty string clears it back to "not measured".
export const updateKpiCurrentSchema = z.object({
  kpiId: z.string().min(1),
  currentValue: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || !Number.isNaN(Number(v)), { error: "Enter a number." }),
});

// Single-team KPI creation with inline weight-budget editing (the team KPI
// tab's richer modal) — separate from createKpiSchema's multi-team flow so
// the weight-budget re-allocation can be committed atomically alongside the
// new KPI in one transaction.
export const createTeamKpiSchema = z.object({
  quarterId: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().trim().min(2, { error: "Enter a KPI name." }).max(80),
  detail: z.string().trim().max(200).optional(),
  categoryId: z.string().optional(),
  rubric: z.string().trim().max(2000).optional(),
  weightPct: z.number().int().min(1).max(100),
  weightEdits: z
    .array(z.object({ kpiTeamId: z.string().min(1), weightPct: z.number().int().min(0).max(100) }))
    .default([]),
});

/** HODs and admins can add to the shared category list. */
export const createKpiCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Give the category a name." })
    .max(40, { error: "Keep a category name under 40 characters." }),
});

/** CSV import: the file is parsed in the browser and sent as rows. */
export const importKpisSchema = z.object({
  quarterId: z.string().min(1),
  teamId: z.string().min(1),
  rows: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(500).optional(),
        categoryName: z.string().trim().max(40).optional(),
        rubric: z.string().trim().max(2000).optional(),
        metricType: z.enum(["number", "percentage", "rating", "currency", "days"]).default("rating"),
        direction: z.enum(["higher_is_better", "lower_is_better"]).default("higher_is_better"),
        targetValue: z.string().trim().min(1),
        unit: z.string().trim().max(20).optional(),
        weightPct: z.number().int().min(0).max(100),
      }),
    )
    .min(1, { error: "The file had no usable rows." })
    .max(100, { error: "Import at most 100 KPIs at a time." }),
});

/** Adding an existing org KPI to a team, at that team's own weight. */
export const adoptKpiSchema = z.object({
  kpiId: z.string().min(1),
  teamId: z.string().min(1),
  weightPct: z.number().int().min(0).max(100),
});

/** Editing a KPI in place. Weights are per team and edited separately. */
export const updateKpiSchema = z.object({
  kpiId: z.string().min(1),
  name: z.string().trim().min(2, { error: "Enter a KPI name." }).max(80),
  description: z.string().trim().max(500).optional(),
  categoryId: z.string().optional(),
  rubric: z.string().trim().max(2000).optional(),
  shareable: z.boolean().default(false),
});

/** Publishing a draft, sending one back to draft, or retiring it. */
export const setKpiLifecycleSchema = z.object({
  kpiId: z.string().min(1),
  lifecycle: z.enum(["draft", "active", "archived"]),
});

/** Publishing a KPI to the org library, or withdrawing it. */
export const setKpiShareableSchema = z.object({
  kpiId: z.string().min(1),
  shareable: z.boolean(),
});
