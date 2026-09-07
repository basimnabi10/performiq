/**
 * Every review scores a KPI on a fixed 1-5 rating scale (see
 * `ReviewKpiScore.rating`'s "// 1-5" comment and `ReviewForm`'s five rating
 * buttons) — regardless of the KPI's own real-world metric. A KPI's
 * `targetNumeric` is expressed in that real-world unit instead (e.g. "≥ 90"
 * for a percentage KPI, "≤ 2.0" for a days KPI), so it is only directly
 * comparable to a 1-5 score when the KPI's metric IS itself a 1-5 rating.
 * For every other metric type there is no unit-preserving way to tell
 * whether a 1-5 performance rating "met" a percentage/days/currency/number
 * target, so on-target is judged against the same "meets expectations"
 * threshold the review form itself uses (see ReviewForm.tsx's BANDS).
 */
const MEETS_EXPECTATIONS_THRESHOLD = 3.5;

export interface KpiTargetInfo {
  metricType: "number" | "percentage" | "rating" | "currency" | "days";
  direction: "higher_is_better" | "lower_is_better";
  // Prisma's Decimal type has a toNumber()-compatible toString(); accept
  // either it or a plain number so callers don't need to convert first.
  targetNumeric: number | { toString(): string } | null;
}

export function isKpiScoreOnTarget(score: number, kpi: KpiTargetInfo): boolean {
  if (kpi.metricType === "rating" && kpi.targetNumeric != null) {
    const target = Number(kpi.targetNumeric);
    return kpi.direction === "lower_is_better" ? score <= target : score >= target;
  }
  return score >= MEETS_EXPECTATIONS_THRESHOLD;
}

/**
 * On/below target for a KPI's actual recorded measurement — unlike
 * `isKpiScoreOnTarget` (which judges a 1-5 review rating), this compares
 * like with like: the recorded value and the target are both in the KPI's
 * own real-world unit, so the comparison is exact whatever the metric type.
 * Returns null when nobody has recorded a value (or no target is set), which
 * renders as "Not measured" rather than a guessed status.
 */
export function kpiMeasurementStatus(
  currentNumeric: number | { toString(): string } | null | undefined,
  kpi: KpiTargetInfo,
): "on" | "below" | null {
  if (currentNumeric == null || kpi.targetNumeric == null) return null;
  const current = Number(currentNumeric);
  const target = Number(kpi.targetNumeric);
  const meets = kpi.direction === "lower_is_better" ? current <= target : current >= target;
  return meets ? "on" : "below";
}

/**
 * Formats a recorded measurement for display in the KPI's own unit, mirroring
 * how `targetValue` is stored ("93%", "2.4 days", "4.6/5").
 */
export function formatKpiMeasurement(value: number, metricType: KpiTargetInfo["metricType"]): string {
  switch (metricType) {
    case "percentage":
      return `${value}%`;
    case "rating":
      return `${value}/5`;
    case "currency":
      return `$${value}`;
    case "days":
      return `${value} days`;
    default:
      return String(value);
  }
}

/**
 * Average target for a "target" reference line on a chart of 1-5 scores.
 * Only rating-type KPIs have a target expressed on that same scale —
 * averaging in a percentage/days/currency/number target would silently mix
 * units into a meaningless number, so those are excluded rather than
 * blended in.
 */
export function averageRatingScaleTarget(kpis: KpiTargetInfo[]): number | null {
  const ratingTargets = kpis
    .filter((k) => k.metricType === "rating" && k.targetNumeric != null)
    .map((k) => Number(k.targetNumeric));
  if (ratingTargets.length === 0) return null;
  return ratingTargets.reduce((s, v) => s + v, 0) / ratingTargets.length;
}
