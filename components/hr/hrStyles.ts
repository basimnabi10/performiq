import type { CSSProperties } from "react";
import { STATUS_LABELS, type ReviewState } from "@/lib/hr-shape";

/** The frosted panel every HR card sits in. */
export const GLASS: CSSProperties = {
  background: "rgba(255,255,255,.20)",
  border: "1px solid rgba(255,255,255,.40)",
  WebkitBackdropFilter: "blur(35px)",
  backdropFilter: "blur(35px)",
  boxShadow: "0 8px 24px rgba(0,0,0,.06)",
  borderRadius: 24,
};

/** A row inside a panel — a list item, a table line. */
export const ROW: CSSProperties = {
  borderRadius: 14,
  background: "rgba(255,255,255,.45)",
  border: "1px solid rgba(255,255,255,.6)",
};

export const SECTION_LABEL: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "#767FA5",
  letterSpacing: ".04em",
  textTransform: "uppercase",
};

export const TAG_BASE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontSize: 11,
  fontWeight: 500,
  padding: "3px 9px",
  borderRadius: 7,
  whiteSpace: "nowrap",
};

export const STATUS: Record<ReviewState, { label: string; color: string; tag: CSSProperties }> = {
  submitted: { label: STATUS_LABELS.submitted, color: "#273FF9", tag: { color: "#273FF9", background: "rgba(58,99,250,.13)" } },
  in_progress: { label: STATUS_LABELS.in_progress, color: "#8BB0FF", tag: { color: "#454D7A", background: "rgba(136,176,255,.26)" } },
  overdue: { label: STATUS_LABELS.overdue, color: "#2C3158", tag: { color: "#fff", background: "#2C3158" } },
  unassigned: {
    label: STATUS_LABELS.unassigned,
    color: "#C8CBE1",
    tag: { color: "#454D7A", background: "rgba(255,255,255,.55)", boxShadow: "inset 0 0 0 1px #A8AFCB" },
  },
};

export const STATUS_ORDER: ReviewState[] = ["submitted", "in_progress", "overdue", "unassigned"];

/** Mood 1–5, worst to best. Deliberately not red/green: a 2 is a person. */
export const MOOD_COLORS = ["#2C3158", "#596392", "#A8AFCB", "#8BB0FF", "#273FF9"];
export const MOOD_LABELS = ["Struggling", "Low", "Okay", "Good", "Great"];

export function fmt1(v: number | null | undefined): string {
  return v == null ? "—" : v.toFixed(1);
}

export function deltaLabel(d: number | null): string {
  if (d == null) return "—";
  if (d > 0) return `▲ ${d.toFixed(1)}`;
  if (d < 0) return `▼ ${Math.abs(d).toFixed(1)}`;
  return "No change";
}

export function deltaStyle(d: number | null): CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    textAlign: "right",
    color: d == null ? "#A8AFCB" : d < 0 ? "#181835" : d > 0 ? "#273FF9" : "#767FA5",
  };
}

/** Where a 1–5 score sits along a strip, as a percentage. */
export function scorePos(v: number): number {
  return ((Math.max(1, Math.min(5, v)) - 1) / 4) * 100;
}

export const AXIS_TICKS = [1, 2, 3, 4, 5];

/**
 * Marks sit inside this much padding. A dot at 1.0 or 5.0 is centred on the
 * track's edge, so without it half the dot is clipped away — and the extremes
 * are exactly the values worth seeing.
 */
export const TRACK_STYLE: CSSProperties = { position: "absolute", top: 0, bottom: 0, left: 8, right: 8 };
