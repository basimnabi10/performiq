/**
 * Weight distribution for a team's KPI framework.
 *
 * Pure functions, deliberately outside the component: the rounding is the
 * fiddly part (five KPIs cannot each take 20% of 100 without a remainder),
 * and it needs to behave identically in the form preview and on the server.
 */

export interface WeightedItem {
  id: string;
  weightPct: number;
}

/**
 * Split 100% as evenly as possible, giving the remainder to the first items
 * rather than leaving the total at 99%. Eight KPIs become 13,13,13,13,12,12,
 * 12,12 — not eight 12s and a missing 4%.
 */
export function distributeEvenly(ids: string[], total = 100): WeightedItem[] {
  if (ids.length === 0) return [];
  const base = Math.floor(total / ids.length);
  let remainder = total - base * ids.length;
  return ids.map((id) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return { id, weightPct: base + extra };
  });
}

/**
 * Proportionally rebalance everything except the one being edited, so the
 * total returns to 100%.
 *
 * Without this, setting one KPI to 40% leaves the framework at 140% and the
 * person has to fix every other row by hand. Items that reach zero stay at
 * zero rather than going negative.
 */
export function rebalanceAround(
  items: WeightedItem[],
  changedId: string,
  newWeight: number,
  total = 100,
): WeightedItem[] {
  const clamped = Math.max(0, Math.min(total, Math.round(newWeight)));
  const others = items.filter((i) => i.id !== changedId);
  const remaining = total - clamped;

  if (others.length === 0) return [{ id: changedId, weightPct: clamped }];

  const othersTotal = others.reduce((sum, i) => sum + i.weightPct, 0);

  // Nothing to scale proportionally against — spread what is left evenly.
  if (othersTotal <= 0) {
    const even = distributeEvenly(others.map((o) => o.id), remaining);
    return items.map((i) =>
      i.id === changedId ? { id: i.id, weightPct: clamped } : even.find((e) => e.id === i.id) ?? { id: i.id, weightPct: 0 },
    );
  }

  const scaled = others.map((o) => ({
    id: o.id,
    weightPct: Math.max(0, Math.round((o.weightPct / othersTotal) * remaining)),
  }));

  // Rounding can leave the total a point or two off; push the difference onto
  // the largest item, which is the least visible place to absorb it.
  const scaledTotal = scaled.reduce((sum, i) => sum + i.weightPct, 0);
  const drift = remaining - scaledTotal;
  if (drift !== 0 && scaled.length > 0) {
    const biggest = scaled.reduce((a, b) => (b.weightPct > a.weightPct ? b : a));
    biggest.weightPct = Math.max(0, biggest.weightPct + drift);
  }

  return items.map((i) =>
    i.id === changedId ? { id: i.id, weightPct: clamped } : scaled.find((sc) => sc.id === i.id) ?? i,
  );
}

export function weightTotal(items: WeightedItem[]): number {
  return items.reduce((sum, i) => sum + i.weightPct, 0);
}
