"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { deleteCourse, markLessonStep, submitQuiz } from "@/actions/learning";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";
import type { LearnerSafeQuestion } from "@/lib/quiz";

type Pane = "video" | "reading" | "quiz";

export function CourseViewer({
  courseId,
  videoUrl,
  articleTitle,
  articleSubtitle,
  articleBody,
  questions,
  progress,
  canManage,
}: {
  courseId: string;
  videoUrl: string | null;
  articleTitle: string;
  articleSubtitle: string | null;
  articleBody: string;
  questions: LearnerSafeQuestion[];
  progress: { videoDone: boolean; readingDone: boolean; quizDone: boolean; quizScore: number | null };
  canManage: boolean;
}) {
  const router = useRouter();
  const [pane, setPane] = useState<Pane>("video");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const stepAction = useAction(markLessonStep);
  const quizAction = useAction(submitQuiz);
  const deleteAction = useAction(deleteCourse, {
    onSuccess: () => router.push("/learning"),
  });

  const [done, setDone] = useState(progress);
  const quizScore = quizAction.result.data?.score ?? done.quizScore;

  function markDone(step: "video" | "reading") {
    setDone((d) => ({ ...d, [step === "video" ? "videoDone" : "readingDone"]: true }));
    stepAction.execute({ courseId, step });
  }

  function submitQuizAnswers() {
    quizAction.execute({
      courseId,
      answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId })),
    });
    setDone((d) => ({ ...d, quizDone: true }));
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(["video", "reading", "quiz"] as Pane[]).map((p) => (
          <button
            key={p}
            onClick={() => setPane(p)}
            style={{
              textAlign: "left",
              border: "none",
              cursor: "pointer",
              padding: "10px 14px",
              borderRadius: 12,
              background: pane === p ? "linear-gradient(135deg,#3A63FA,#273FF9)" : "rgba(255,255,255,.4)",
              color: pane === p ? "#fff" : "#454D7A",
              fontSize: 13,
            }}
          >
            {p === "video" ? "Video lesson" : p === "reading" ? "Reading" : "Practice quiz"}
            {(p === "video" && done.videoDone) || (p === "reading" && done.readingDone) || (p === "quiz" && done.quizDone)
              ? " ✓"
              : ""}
          </button>
        ))}

        {canManage ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            <a href={`/learning/new?edit=${courseId}`} style={{ fontSize: 13, color: "#8BB0FF", textDecoration: "none" }}>
              Edit course
            </a>
            {confirmDelete ? (
              <div style={{ display: "flex", gap: 6 }}>
                <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => deleteAction.execute({ courseId })}>
                  Confirm delete
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ fontSize: 13, color: "#FF5A5F", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
              >
                Delete course
              </button>
            )}
          </div>
        ) : null}
      </div>

      <FrostCard style={{ minHeight: 320 }}>
        {pane === "video" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                height: 220,
                borderRadius: 16,
                background: "rgba(255,255,255,.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {videoUrl ? (
                <a href={videoUrl} target="_blank" rel="noreferrer" className="piq-caption">
                  Open video ↗
                </a>
              ) : (
                <span className="piq-caption">No video attached</span>
              )}
            </div>
            <Button onClick={() => markDone("video")} disabled={done.videoDone}>
              {done.videoDone ? "Completed" : "Mark as completed"}
            </Button>
          </div>
        ) : pane === "reading" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div className="piq-h2">{articleTitle}</div>
              {articleSubtitle ? <div className="piq-caption">{articleSubtitle}</div> : null}
            </div>
            <div className="piq-body" style={{ lineHeight: 1.7 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{articleBody}</ReactMarkdown>
            </div>
            <Button onClick={() => markDone("reading")} disabled={done.readingDone}>
              {done.readingDone ? "Completed" : "Mark as completed"}
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {questions.length === 0 ? (
              <div className="piq-caption">No quiz for this course.</div>
            ) : (
              questions.map((q) => (
                <div key={q.id}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>{q.text}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {q.options.map((o) => (
                      <label key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === o.id}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                        />
                        {o.text}
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
            {quizScore != null ? (
              <div className="piq-caption">Score: {quizScore}%</div>
            ) : null}
            {questions.length > 0 ? (
              <Button onClick={submitQuizAnswers} disabled={quizAction.isExecuting || Object.keys(answers).length < questions.length}>
                {quizAction.isExecuting ? "Submitting…" : "Submit quiz"}
              </Button>
            ) : null}
          </div>
        )}
      </FrostCard>
    </div>
  );
}
