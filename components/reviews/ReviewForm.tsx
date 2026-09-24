"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { saveReviewDraft, submitReview } from "@/actions/reviews";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";

export interface ReviewFormKpi {
  kpiId: string;
  name: string;
  description: string | null;
  /** What the 1-5 ratings mean for this KPI, if whoever set it up wrote it. */
  rubric?: string | null;
  categoryName?: string | null;
  targetValue: string;
  unit: string | null;
  weightPct: number;
  metricType: "number" | "percentage" | "rating" | "currency" | "days";
  initialRating: number | null;
  initialComment: string | null;
}

const METRIC_ICON: Record<ReviewFormKpi["metricType"], string> = {
  rating: "ant-design:star-outlined",
  percentage: "ant-design:pie-chart-outlined",
  days: "ant-design:clock-circle-outlined",
  number: "ant-design:bar-chart-outlined",
  currency: "ant-design:dollar-outlined",
};

const BANDS = [
  { min: 4.5, label: "Exceeds expectations" },
  { min: 3.5, label: "Meets expectations" },
  { min: 2.5, label: "Partially meets — needs attention" },
  { min: 0, label: "Below expectations" },
];

export function ReviewForm({
  reviewId,
  kpis,
  readOnly,
  readOnlyReason,
  returnTo,
  submitted = false,
  submittedLabel,
}: {
  reviewId: string;
  kpis: ReviewFormKpi[];
  readOnly: boolean;
  /** The review has been submitted and the member can already see it. */
  submitted?: boolean;
  /** When it was submitted, formatted on the server to keep dates stable. */
  submittedLabel?: string;
  /** Where to go once the review is saved or submitted — the member list the
   * reviewer is working through. */
  returnTo?: string;
  /** Why the form can't be edited — without this a read-only form just looks
   * broken: the rating buttons silently do nothing and the submit button is
   * gone, with no explanation of either. */
  readOnlyReason?: string;
}) {
  const [ratings, setRatings] = useState<Record<string, number>>(
    Object.fromEntries(kpis.map((k) => [k.kpiId, k.initialRating ?? 0])),
  );
  const [comments, setComments] = useState<Record<string, string>>(
    Object.fromEntries(kpis.map((k) => [k.kpiId, k.initialComment ?? ""])),
  );

  // A submitted review opens locked even when the viewer is allowed to change
  // it. Someone has already been shown these scores, so re-opening them is a
  // decision rather than something you drift into by clicking a rating.
  const [editing, setEditing] = useState(false);
  const locked = readOnly || (submitted && !editing);

  function discardEdits() {
    setRatings(Object.fromEntries(kpis.map((k) => [k.kpiId, k.initialRating ?? 0])));
    setComments(Object.fromEntries(kpis.map((k) => [k.kpiId, k.initialComment ?? ""])));
    setEditing(false);
  }

  const router = useRouter();

  // Saving or submitting returns to wherever the review was opened from --
  // the reviewer is working through a list of people, and leaving them
  // parked on a finished form means navigating back by hand for every one.
  // Without a return path (a review opened from a link or the flat list),
  // stay put: sending someone to a team page they did not come from would
  // be its own kind of lost.
  const goBack = () => {
    if (returnTo) router.push(returnTo);
    else router.refresh();
  };

  const draftAction = useAction(saveReviewDraft, { onSuccess: goBack });
  const submitAction = useAction(submitReview, { onSuccess: goBack });

  const weightedScore = useMemo(() => {
    let weightedSum = 0;
    let weightTotal = 0;
    for (const k of kpis) {
      const rating = ratings[k.kpiId] ?? 0;
      if (rating > 0) {
        weightedSum += rating * k.weightPct;
        weightTotal += k.weightPct;
      }
    }
    return weightTotal > 0 ? weightedSum / weightTotal : 0;
  }, [ratings, kpis]);

  const band = BANDS.find((b) => weightedScore >= b.min) ?? BANDS[BANDS.length - 1];

  function payload() {
    return {
      reviewId,
      kpiScores: kpis.map((k) => ({
        kpiId: k.kpiId,
        rating: ratings[k.kpiId] || 1,
        comment: comments[k.kpiId] || undefined,
      })),
    };
  }

  const busy = draftAction.isExecuting || submitAction.isExecuting;
  const error = draftAction.result.serverError ?? submitAction.result.serverError;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {readOnly && readOnlyReason ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "13px 16px",
            background: "rgba(89,99,146,.10)",
            border: "1px solid rgba(168,175,203,.4)",
            borderRadius: 14,
          }}
        >
          <iconify-icon icon="ant-design:lock-outlined" width={16} style={{ color: "#596392", flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: "#454D7A", lineHeight: 1.5 }}>{readOnlyReason}</div>
        </div>
      ) : submitted && !editing ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "13px 16px",
            background: "rgba(31,122,72,.09)",
            border: "1px solid rgba(31,122,72,.25)",
            borderRadius: 14,
          }}
        >
          <iconify-icon icon="ant-design:check-circle-outlined" width={16} style={{ color: "#1F7A48", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 220, fontSize: 13, color: "#454D7A", lineHeight: 1.5 }}>
            {submittedLabel ? `Submitted ${submittedLabel}.` : "This review has been submitted."} The member can see
            these scores.
          </div>
          <Button variant="secondary" size="sm" icon="ant-design:edit-outlined" onClick={() => setEditing(true)}>
            Edit review
          </Button>
        </div>
      ) : submitted && editing ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "13px 16px",
            background: "rgba(39,63,249,.07)",
            border: "1px solid rgba(39,63,249,.20)",
            borderRadius: 14,
          }}
        >
          <iconify-icon icon="ant-design:edit-outlined" width={16} style={{ color: "#273FF9", flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: "#454D7A", lineHeight: 1.5 }}>
            Editing a review the member has already seen. Saving replaces the scores they were shown.
          </div>
        </div>
      ) : null}

      {kpis.map((k) => (
        <FrostCard key={k.kpiId} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "rgba(58,99,250,.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#273FF9",
                  flexShrink: 0,
                }}
              >
                <iconify-icon icon={METRIC_ICON[k.metricType]} width={16} />
              </span>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{k.name}</span>
            </div>
            <span className="piq-caption">
              Weight {k.weightPct}% · Target {k.targetValue} {k.unit ?? ""}
            </span>
          </div>
          {k.description ? <div className="piq-caption">{k.description}</div> : null}

          {k.rubric ? (
            // Shown with the ratings rather than hidden behind a tooltip: a
            // rubric nobody reads is the same as no rubric, and the whole
            // point is that two reviewers scoring the same work agree.
            <div
              style={{
                display: "flex",
                gap: 9,
                marginTop: 8,
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(89,99,146,.08)",
                border: "1px solid rgba(168,175,203,.35)",
              }}
            >
              <iconify-icon
                icon="ant-design:info-circle-outlined"
                width={14}
                style={{ color: "var(--text-secondary)", flexShrink: 0, marginTop: 2 }}
              />
              <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--text-body)", whiteSpace: "pre-wrap" }}>
                {k.rubric}
              </div>
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={locked}
                onClick={() => setRatings((r) => ({ ...r, [k.kpiId]: n }))}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "none",
                  cursor: locked ? "not-allowed" : "pointer",
                  fontWeight: 500,
                  opacity: locked ? 0.55 : 1,
                  background:
                    (ratings[k.kpiId] ?? 0) >= n
                      ? "linear-gradient(135deg,#3A63FA,#273FF9)"
                      : "rgba(255,255,255,.5)",
                  color: (ratings[k.kpiId] ?? 0) >= n ? "#fff" : "#596392",
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <textarea
            placeholder="Comment (optional)"
            disabled={locked}
            value={comments[k.kpiId] ?? ""}
            onChange={(e) => setComments((c) => ({ ...c, [k.kpiId]: e.target.value }))}
            rows={2}
            style={{
              border: "1px solid rgba(255,255,255,.6)",
              borderRadius: 11,
              padding: "8px 12px",
              fontFamily: "'Switzer',sans-serif",
              fontSize: 13,
              background: "rgba(255,255,255,.45)",
              outline: "none",
              resize: "vertical",
            }}
          />
        </FrostCard>
      ))}

      <FrostCard tone="ink" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="piq-caption" style={{ color: "#A8AFCB" }}>
            Weighted overall score
          </div>
          <div style={{ fontSize: 30, fontWeight: 500, color: "#fff" }}>{weightedScore.toFixed(1)} / 5</div>
        </div>
        <div style={{ color: "#8BB0FF", fontSize: 14 }}>{band.label}</div>
      </FrostCard>

      {error ? (
        <div className="piq-caption" style={{ color: "#FF5A5F" }}>
          {error}
        </div>
      ) : null}

      {!locked ? (
        <div style={{ display: "flex", gap: 10 }}>
          {submitted ? (
            <Button variant="secondary" disabled={busy} onClick={discardEdits}>
              Cancel
            </Button>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => draftAction.execute(payload())}>
              {draftAction.isExecuting ? "Saving…" : "Save draft"}
            </Button>
          )}
          <Button disabled={busy} onClick={() => submitAction.execute(payload())}>
            {submitAction.isExecuting
              ? "Saving…"
              : submitted
                ? "Save changes"
                : "Submit review"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
