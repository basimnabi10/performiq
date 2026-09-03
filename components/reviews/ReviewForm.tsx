"use client";

import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
import { saveReviewDraft, submitReview } from "@/actions/reviews";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";

export interface ReviewFormKpi {
  kpiId: string;
  name: string;
  description: string | null;
  targetValue: string;
  unit: string | null;
  weightPct: number;
  initialRating: number | null;
  initialComment: string | null;
}

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
}: {
  reviewId: string;
  kpis: ReviewFormKpi[];
  readOnly: boolean;
}) {
  const [ratings, setRatings] = useState<Record<string, number>>(
    Object.fromEntries(kpis.map((k) => [k.kpiId, k.initialRating ?? 0])),
  );
  const [comments, setComments] = useState<Record<string, string>>(
    Object.fromEntries(kpis.map((k) => [k.kpiId, k.initialComment ?? ""])),
  );

  const draftAction = useAction(saveReviewDraft);
  const submitAction = useAction(submitReview);

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
      {kpis.map((k) => (
        <FrostCard key={k.kpiId} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{k.name}</span>
            <span className="piq-caption">
              Weight {k.weightPct}% · Target {k.targetValue} {k.unit ?? ""}
            </span>
          </div>
          {k.description ? <div className="piq-caption">{k.description}</div> : null}
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={readOnly}
                onClick={() => setRatings((r) => ({ ...r, [k.kpiId]: n }))}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "none",
                  cursor: readOnly ? "default" : "pointer",
                  fontWeight: 500,
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
            disabled={readOnly}
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

      {!readOnly ? (
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" disabled={busy} onClick={() => draftAction.execute(payload())}>
            {draftAction.isExecuting ? "Saving…" : "Save draft"}
          </Button>
          <Button disabled={busy} onClick={() => submitAction.execute(payload())}>
            {submitAction.isExecuting ? "Submitting…" : "Submit review"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
