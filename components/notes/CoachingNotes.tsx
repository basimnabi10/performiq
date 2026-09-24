"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addCoachingNote, deleteCoachingNote } from "@/actions/notes";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormMessage";

export interface CoachingNoteRow {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
}

/**
 * Coaching notes for one person: write one, read the history.
 *
 * Shown on their profile and beside the review form, because the point of
 * keeping notes through the month is having them in front of you when you sit
 * down to write the review.
 */
export function CoachingNotes({
  memberId,
  memberName,
  notes,
  canWrite,
  actorId,
  actorName,
  actorAvatarUrl = null,
  isAdmin,
  compact = false,
}: {
  memberId: string;
  memberName: string;
  notes: CoachingNoteRow[];
  canWrite: boolean;
  actorId: string;
  /** The writer, so a new note can appear without waiting for a round trip. */
  actorName: string;
  actorAvatarUrl?: string | null;
  isAdmin: boolean;
  /** Tighter spacing for the narrow column beside a review form. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");

  // The list is rendered from local state seeded by the server, so a saved
  // note appears the moment it saves. router.refresh() alone left the note in
  // the database and the list unchanged, which reads as a failed save.
  const [items, setItems] = useState(notes);
  const [seenFromServer, setSeenFromServer] = useState(notes);
  if (seenFromServer !== notes) {
    // Server data changed (a refresh landed): adopt it and drop any
    // optimistic entries, which it now contains.
    setSeenFromServer(notes);
    setItems(notes);
  }

  // revalidatePath marks the server data stale, but this page is not being
  // navigated to -- without an explicit refresh the note saves and the list
  // sits there unchanged, which reads as though nothing happened.
  const add = useAction(addCoachingNote, {
    onSuccess: ({ data }) => {
      if (data?.noteId) {
        setItems((current) => [
          {
            id: data.noteId,
            body: body.trim(),
            createdAt: new Date().toISOString(),
            authorId: actorId,
            authorName: actorName,
            authorAvatarUrl: actorAvatarUrl,
          },
          ...current,
        ]);
      }
      setBody("");
      router.refresh();
    },
  });

  const remove = useAction(deleteCoachingNote, {
    onSuccess: () => router.refresh(),
  });

  function handleDelete(noteId: string) {
    setItems((current) => current.filter((n) => n.id !== noteId));
    remove.execute({ noteId });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 12 : 16 }}>
      {canWrite ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim().length >= 2) add.execute({ memberId, body });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 9 }}
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Something ${memberName.split(" ")[0]} did well, or something to work on…`}
            rows={compact ? 3 : 4}
            className="piq-input"
            style={{ height: "auto", padding: "12px 14px", resize: "vertical", lineHeight: 1.5 }}
          />
          <FormError>{add.result.serverError ?? add.result.validationErrors?.body?._errors?.[0]}</FormError>
          <Button
            type="submit"
            size="sm"
            disabled={add.isExecuting || body.trim().length < 2}
            style={{ alignSelf: "flex-start" }}
          >
            {add.isExecuting ? "Saving…" : "Add note"}
          </Button>
        </form>
      ) : null}

      {items.length === 0 ? (
        <div className="piq-caption" style={{ lineHeight: 1.55 }}>
          {canWrite
            ? "No notes yet. Anything recorded here stays between you, their manager and them — it is never part of a review shared with HR."
            : "No notes yet."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((n) => (
            <div
              key={n.id}
              style={{
                padding: compact ? "11px 13px" : "13px 15px",
                borderRadius: 14,
                background: "rgba(255,255,255,.55)",
                border: "1px solid rgba(255,255,255,.7)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
                <Avatar name={n.authorName} src={n.authorAvatarUrl} size={24} round />
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-strong)" }}>{n.authorName}</span>
                <span className="piq-caption" style={{ fontSize: 11.5 }}>
                  {new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
                {n.authorId === actorId || isAdmin ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(n.id)}
                    disabled={remove.isExecuting}
                    title="Delete this note"
                    aria-label="Delete this note"
                    style={{
                      marginLeft: "auto",
                      border: "none",
                      background: "transparent",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      padding: 2,
                      lineHeight: 0,
                    }}
                  >
                    <iconify-icon icon="ant-design:delete-outlined" width={14} />
                  </button>
                ) : null}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-body)", whiteSpace: "pre-wrap" }}>
                {n.body}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
