"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { respondToReview } from "@/actions/reviews";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import { FormError } from "@/components/ui/FormMessage";

/**
 * The reviewee's reply, shown under their review.
 *
 * Visible to everyone who can see the review, because the point is that their
 * side sits on the record beside the scores rather than in a private message
 * their manager may or may not act on.
 */
export function RevieweeResponse({
  reviewId,
  existing,
  repliedAt,
  canReply,
  revieweeName,
}: {
  reviewId: string;
  existing: string | null;
  repliedAt: string | null;
  /** True only for the person the review is about. */
  canReply: boolean;
  revieweeName: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState(existing ?? "");
  const [editing, setEditing] = useState(false);

  const respond = useAction(respondToReview, {
    onSuccess: () => {
      setEditing(false);
      router.refresh();
    },
  });

  const showForm = canReply && (editing || !existing);

  if (!existing && !canReply) return null;

  return (
    <FrostCard tone="solid" padding={20} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text-strong)" }}>
          {canReply ? "Your response" : `${revieweeName.split(" ")[0]}'s response`}
        </div>
        <div className="piq-caption" style={{ marginTop: 3, lineHeight: 1.55 }}>
          {canReply
            ? "Anything you want on the record alongside this review — agreement, context, or where you see it differently. Your reviewer and HOD can see it."
            : repliedAt
              ? `Replied ${new Date(repliedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}.`
              : "No response yet."}
        </div>
      </div>

      {existing && !showForm ? (
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-body)", whiteSpace: "pre-wrap" }}>
          {existing}
        </div>
      ) : null}

      {showForm ? (
        <>
          <textarea
            className="piq-input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Write your response…"
            style={{ height: "auto", padding: "12px 14px", resize: "vertical", lineHeight: 1.5 }}
          />
          <FormError>{respond.result.serverError ?? respond.result.validationErrors?.body?._errors?.[0]}</FormError>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              size="sm"
              disabled={respond.isExecuting || body.trim().length < 2}
              onClick={() => respond.execute({ reviewId, body })}
            >
              {respond.isExecuting ? "Saving…" : existing ? "Update response" : "Send response"}
            </Button>
            {existing ? (
              <Button variant="secondary" size="sm" onClick={() => { setBody(existing); setEditing(false); }}>
                Cancel
              </Button>
            ) : null}
          </div>
        </>
      ) : null}

      {existing && canReply && !showForm ? (
        <Button variant="secondary" size="sm" style={{ alignSelf: "flex-start" }} onClick={() => setEditing(true)}>
          Edit response
        </Button>
      ) : null}
    </FrostCard>
  );
}
