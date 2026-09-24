/**
 * How a review's state is shown, in one place.
 *
 * "Overdue" is not a status anyone sets — it is a pending review whose month
 * has passed. Deriving it here rather than in each table is what stops the
 * reviews list, the member cards and the dashboard from disagreeing about
 * whether the same review is late.
 */

export type ReviewDbStatus = "draft" | "pending" | "in_progress" | "completed";
export type ReviewDisplayStatus = "completed" | "overdue" | "draft" | "pending";

export interface ReviewStatusTone {
  label: string;
  bg: string;
  color: string;
}

export const REVIEW_STATUS_TONES: Record<ReviewDisplayStatus, ReviewStatusTone> = {
  // Green: done, nothing owed.
  completed: { label: "Completed", bg: "rgba(47,191,113,.16)", color: "#1B7A48" },
  // Red: the month it belonged to has gone and it was never finished.
  overdue: { label: "Overdue", bg: "rgba(255,90,95,.16)", color: "#A8282C" },
  // Blue: started, not finished — distinct from untouched, so a reviewer can
  // see where they left off.
  draft: { label: "Draft saved", bg: "rgba(39,63,249,.12)", color: "#1C10C9" },
  // Yellow: waiting on someone, still in time.
  pending: { label: "Pending", bg: "rgba(250,173,20,.18)", color: "#8A5D00" },
};

/**
 * `cycleEnd` is the end of the month the review belongs to. A review is late
 * only once that month is actually over — an unfinished review on the 3rd is
 * simply not done yet, and colouring it red would make half a live cycle look
 * like a failure.
 */
export function reviewDisplayStatus(
  status: ReviewDbStatus | string,
  cycleEnd: Date | string | null | undefined,
  now: Date = new Date(),
): ReviewDisplayStatus {
  if (status === "completed") return "completed";

  const end = cycleEnd ? new Date(cycleEnd) : null;
  if (end && end.getTime() < now.getTime()) return "overdue";

  return status === "in_progress" || status === "draft" ? "draft" : "pending";
}

export function reviewStatusTone(
  status: ReviewDbStatus | string,
  cycleEnd: Date | string | null | undefined,
  now?: Date,
): ReviewStatusTone {
  return REVIEW_STATUS_TONES[reviewDisplayStatus(status, cycleEnd, now)];
}
