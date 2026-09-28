/**
 * Shapes and thresholds for the HR dashboard.
 *
 * Kept apart from `hr-data.ts` because the tab components need these values
 * at runtime, and that module is server-only — the queries in it must never
 * be reachable from a client bundle.
 */

/** Below this many check-ins, a department's wellbeing is not shown at all. */
export const WELLBEING_MIN_GROUP = 5;
/** A review scoring under this on a KPI counts as under target. */
export const KPI_TARGET = 4;
/** Spread under this across a reviewer's scores reads as flat marking. */
export const FLAT_SPREAD = 0.2;
/** A fall of at least this much against the previous period is called out. */
export const DROP_THRESHOLD = 0.3;

export type ReviewState = "submitted" | "in_progress" | "overdue" | "unassigned";

/** One wording for each state, shared by the page, the tags and the CSV. */
export const STATUS_LABELS: Record<ReviewState, string> = {
  submitted: "Submitted",
  in_progress: "In progress",
  overdue: "Overdue",
  unassigned: "No reviewer",
};

export interface HrPerson {
  memberId: string;
  name: string;
  email: string;
  empId: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  department: string;
  team: string;
  /** Who leads the department — the person to chase when no reviewer is set. */
  hod: string | null;
  reviewerName: string | null;
  reviewId: string | null;
  state: ReviewState;
  submittedAt: string | null;
  score: number | null;
  prevScore: number | null;
  delta: number | null;
  /** Per-KPI ratings from the submitted review, for the under-target panel. */
  kpis: { name: string; rating: number }[];
  learning: { course: string; status: string; progressPct: number; dueDate: string | null }[];
}

export interface HrTeamRow {
  teamId: string;
  name: string;
  department: string;
  hod: string | null;
  headcount: number;
  avg: number | null;
  prevAvg: number | null;
  delta: number | null;
  done: number;
  total: number;
}

export interface HrDeptStatus {
  name: string;
  hod: string | null;
  submitted: number;
  inProgress: number;
  overdue: number;
  unassigned: number;
  total: number;
}

export interface HrWellbeing {
  name: string;
  /** Null when the group is too small to report without identifying people. */
  avg: number | null;
  counts: number[];
  checkIns: number;
  people: number;
  suppressed: boolean;
}

export interface HrStrip {
  label: string;
  sub: string;
  scores: number[];
  mean: number | null;
  min: number | null;
  max: number | null;
  flat: boolean;
}

export interface HrMonth {
  key: string;
  label: string;
  status: string;
  daysLeft?: number;
}

/** Everything one HR page render needs, for one month. */
export interface HrDashboard {
  months: HrMonth[];
  selectedKey: string;
  selectedLabel: string;
  selectedDaysLeft?: number;
  previousLabel: string | null;
  people: HrPerson[];
  deptStatus: HrDeptStatus[];
  teamRows: HrTeamRow[];
  wellbeing: HrWellbeing[];
  histogram: { label: string; count: number }[];
  deptStrips: HrStrip[];
  reviewerStrips: HrStrip[];
  headcount: number;
}
