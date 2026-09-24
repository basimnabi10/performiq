/**
 * Check-in weeks run Monday to Sunday, in UTC.
 *
 * The week is identified by its Monday, stored in MoodCheckin.date — so the
 * existing unique index on (memberId, date) is what enforces one check-in per
 * person per week, rather than a rule the application has to remember.
 */

/** The Monday of the week containing `date`, as a date-only UTC value. */
export function weekStart(date: Date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // getUTCDay: 0 = Sunday. Sunday belongs to the week that began six days
  // earlier, not the one starting tomorrow.
  const shift = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - shift);
  return d;
}

export function weekEnd(date: Date = new Date()): Date {
  const start = weekStart(date);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59, 999));
}

/** e.g. "22–28 Sep" — the week a check-in belongs to, in words. */
export function weekLabel(date: Date = new Date()): string {
  const start = weekStart(date);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6));
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const fmt = (d: Date, withMonth: boolean) =>
    d.toLocaleDateString("en-GB", { day: "numeric", ...(withMonth ? { month: "short" } : {}), timeZone: "UTC" });
  return `${fmt(start, !sameMonth)}–${fmt(end, true)}`;
}

/** Days left in the current check-in week, for "closes in 3 days" style copy. */
export function daysLeftInWeek(date: Date = new Date()): number {
  return Math.max(0, Math.ceil((weekEnd(date).getTime() - date.getTime()) / 86_400_000));
}
