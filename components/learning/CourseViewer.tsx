"use client";

import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { deleteCourse, markLessonStep, submitQuiz } from "@/actions/learning";

type Pane = "video" | "reading" | "quiz";

interface ViewerOption {
  id: string;
  text: string;
  order: number;
  isCorrect?: boolean;
}

interface ViewerQuestion {
  id: string;
  text: string;
  order: number;
  options: ViewerOption[];
}

export function CourseViewer({
  courseId,
  category,
  title,
  level,
  duration,
  videoUrl,
  summary,
  articleTitle,
  articleSubtitle,
  articleBody,
  questions,
  revealAnswers,
  progress,
  canManage,
}: {
  courseId: string;
  category: string;
  title: string;
  level: string;
  duration: string;
  videoUrl: string | null;
  summary: string;
  articleTitle: string;
  articleSubtitle: string | null;
  articleBody: string;
  questions: ViewerQuestion[];
  revealAnswers: boolean;
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
  const readMin = Math.max(1, Math.round(articleBody.split(/\s+/).filter(Boolean).length / 200));
  const doneCount = [done.videoDone, done.readingDone, done.quizDone].filter(Boolean).length;
  const pct = Math.round((doneCount / 3) * 100);

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
        <div>
          <Link href="/learning" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, color: "#596392", textDecoration: "none" }}>
            <iconify-icon icon="ant-design:arrow-left-outlined" width="14" />
            Learning · {category}
          </Link>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", marginTop: 6 }}>{title}</div>
          <div style={{ fontSize: 14, color: "#596392", marginTop: 3 }}>
            {category} · {level} · {duration}
          </div>
        </div>
        {canManage ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 500,
                padding: "8px 13px",
                borderRadius: 8,
                color: "#273FF9",
                background: "rgba(58,99,250,.13)",
              }}
            >
              <iconify-icon icon="ant-design:eye-outlined" width="14" />
              Learner view
            </span>
            <Link
              href={`/learning/new?edit=${courseId}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 44,
                padding: "0 16px",
                font: "500 13px 'Switzer',sans-serif",
                color: "#273FF9",
                background: "rgba(255,255,255,.55)",
                border: "1px solid rgba(255,255,255,.75)",
                borderRadius: 14,
                textDecoration: "none",
              }}
            >
              <iconify-icon icon="ant-design:edit-outlined" width="15" />
              Edit course
            </Link>
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                height: 44,
                width: 46,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#252944",
                background: "rgba(255,255,255,.55)",
                border: "1px solid rgba(255,255,255,.75)",
                borderRadius: 14,
                cursor: "pointer",
              }}
            >
              <iconify-icon icon="ant-design:delete-outlined" width="17" />
            </button>
          </div>
        ) : null}
      </div>

      {confirmDelete ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "rgba(37,41,68,.06)", border: "1px solid rgba(37,41,68,.14)", borderRadius: 13 }}>
          <iconify-icon icon="ant-design:warning-outlined" width="18" style={{ color: "#252944" }} />
          <span style={{ flex: 1, fontSize: 13, color: "#252944" }}>Delete this course? Learners will lose access. This can&rsquo;t be undone.</span>
          <button
            onClick={() => setConfirmDelete(false)}
            style={{ height: 36, padding: "0 14px", font: "500 12px 'Switzer',sans-serif", color: "#454D7A", background: "rgba(255,255,255,.7)", border: "1px solid rgba(168,175,203,.4)", borderRadius: 10, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={() => deleteAction.execute({ courseId })}
            disabled={deleteAction.isExecuting}
            style={{ height: 36, padding: "0 14px", font: "500 12px 'Switzer',sans-serif", color: "#fff", background: "#252944", border: "none", borderRadius: 10, cursor: "pointer" }}
          >
            {deleteAction.isExecuting ? "Deleting…" : "Delete course"}
          </button>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>
        <div
          style={{
            background: "rgba(255,255,255,.20)",
            border: "1px solid rgba(255,255,255,.40)",
            WebkitBackdropFilter: "blur(35px)",
            backdropFilter: "blur(35px)",
            boxShadow: "0 8px 24px rgba(0,0,0,.06)",
            borderRadius: 22,
            padding: 20,
            position: "sticky",
            top: 26,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 13, paddingBottom: 16, borderBottom: "1px solid rgba(168,175,203,.25)" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                flexShrink: 0,
                background: `conic-gradient(#273FF9 0 ${pct}%,rgba(168,175,203,.35) ${pct}% 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums" }}>
                {pct}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#181835" }}>Your progress</div>
              <div style={{ fontSize: 12, color: "#767FA5" }}>{doneCount} of 3 complete</div>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#767FA5", letterSpacing: ".05em", textTransform: "uppercase", margin: "16px 0 10px" }}>
            Module 1 · Lessons
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <LessonItem active={pane === "video"} done={done.videoDone} icon="ant-design:play-circle-outlined" title="Video lesson" meta={`Video · ${duration}`} onClick={() => setPane("video")} />
            <LessonItem active={pane === "reading"} done={done.readingDone} icon="ant-design:read-outlined" title="Reading" meta={`Article · ${readMin} min read`} onClick={() => setPane("reading")} />
            <LessonItem active={pane === "quiz"} done={done.quizDone} icon="ant-design:form-outlined" title="Practice quiz" meta={`Quiz · ${questions.length} question${questions.length === 1 ? "" : "s"}`} onClick={() => setPane("quiz")} />
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,.20)",
            border: "1px solid rgba(255,255,255,.40)",
            WebkitBackdropFilter: "blur(35px)",
            backdropFilter: "blur(35px)",
            boxShadow: "0 8px 24px rgba(0,0,0,.06)",
            borderRadius: 22,
            padding: "28px 32px",
            minWidth: 0,
          }}
        >
          {pane === "video" ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#273FF9", letterSpacing: ".04em", textTransform: "uppercase" }}>Video lesson</div>
              <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", marginTop: 4 }}>{articleTitle}</div>
              <a
                href={videoUrl ?? undefined}
                target={videoUrl ? "_blank" : undefined}
                rel="noreferrer"
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "16/9",
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "linear-gradient(150deg,#2C3158,#181835)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 16,
                  cursor: videoUrl ? "pointer" : "default",
                }}
              >
                <div style={{ position: "absolute", width: 300, height: 300, right: -70, top: -110, borderRadius: "50%", background: "radial-gradient(circle,rgba(58,99,250,.4),transparent 70%)" }} />
                <span
                  style={{
                    position: "relative",
                    width: 74,
                    height: 74,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,.95)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#273FF9",
                    boxShadow: "0 10px 30px rgba(0,0,0,.4)",
                  }}
                >
                  <iconify-icon icon="ant-design:caret-right-filled" width="34" />
                </span>
                <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, background: "rgba(255,255,255,.2)" }}>
                  <span style={{ display: "block", width: done.videoDone ? "100%" : "0%", height: "100%", background: "linear-gradient(90deg,#3A63FA,#273FF9)" }} />
                </span>
                <span style={{ position: "absolute", bottom: 16, right: 16, fontSize: 12, fontWeight: 500, color: "#fff", background: "rgba(0,0,0,.55)", padding: "4px 10px", borderRadius: 7, fontVariantNumeric: "tabular-nums" }}>
                  {duration}
                </span>
              </a>
              {summary ? <div style={{ fontSize: 15, color: "#454D7A", marginTop: 16, lineHeight: 1.6 }}>{summary}</div> : null}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(168,175,203,.25)" }}>
                <MarkButton done={done.videoDone} onClick={() => markDone("video")} />
                <span onClick={() => setPane("reading")} style={{ fontSize: 13, fontWeight: 500, color: "#273FF9", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  Next: Reading <iconify-icon icon="ant-design:arrow-right-outlined" width="13" />
                </span>
              </div>
            </div>
          ) : pane === "reading" ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#273FF9", letterSpacing: ".04em", textTransform: "uppercase" }}>Reading</span>
                <span style={{ fontSize: 12, color: "#767FA5" }}>· {readMin} min read</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", lineHeight: 1.25, marginTop: 8 }}>{articleTitle}</div>
              {articleSubtitle ? <div style={{ fontSize: 18, color: "#767FA5", marginTop: 6 }}>{articleSubtitle}</div> : null}
              <div style={{ height: 1, background: "rgba(168,175,203,.3)", margin: "18px 0" }} />
              <div style={{ fontSize: 17, lineHeight: 1.8, color: "#252944" }}>
                {articleBody ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{articleBody}</ReactMarkdown>
                ) : (
                  <span style={{ color: "#767FA5" }}>No article content yet.</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 26, paddingTop: 20, borderTop: "1px solid rgba(168,175,203,.25)" }}>
                <MarkButton done={done.readingDone} onClick={() => markDone("reading")} />
                <span onClick={() => setPane("quiz")} style={{ fontSize: 13, fontWeight: 500, color: "#273FF9", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  Next: Quiz <iconify-icon icon="ant-design:arrow-right-outlined" width="13" />
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#273FF9", letterSpacing: ".04em", textTransform: "uppercase" }}>Practice quiz</div>
                  <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", marginTop: 4 }}>Check your understanding</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#273FF9", background: "rgba(58,99,250,.13)", padding: "5px 12px", borderRadius: 8 }}>
                  {questions.length} question{questions.length === 1 ? "" : "s"}
                </span>
              </div>

              {questions.length === 0 ? (
                <div className="piq-caption" style={{ marginTop: 14 }}>
                  No quiz for this course.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 14 }}>
                  {questions.map((q, qi) => (
                    <div key={q.id} style={{ background: "rgba(255,255,255,.5)", border: "1px solid rgba(168,175,203,.3)", borderRadius: 16, padding: 20 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 14 }}>
                        <span style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(58,99,250,.12)", color: "#273FF9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
                          {qi + 1}
                        </span>
                        <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "#181835", paddingTop: 2 }}>{q.text}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 9, paddingLeft: 37 }}>
                        {q.options.map((o, oi) => {
                          const letter = String.fromCharCode(65 + oi);
                          if (revealAnswers) {
                            return (
                              <div
                                key={o.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 11,
                                  padding: "11px 13px",
                                  borderRadius: 11,
                                  fontSize: 14,
                                  background: o.isCorrect ? "rgba(58,99,250,.07)" : "rgba(255,255,255,.6)",
                                  border: `1.5px solid ${o.isCorrect ? "rgba(58,99,250,.35)" : "rgba(168,175,203,.3)"}`,
                                }}
                              >
                                <span
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 8,
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: o.isCorrect ? "#fff" : "#596392",
                                    background: o.isCorrect ? "#273FF9" : "rgba(168,175,203,.25)",
                                  }}
                                >
                                  {letter}
                                </span>
                                <span style={{ flex: 1, color: "#252944" }}>{o.text}</span>
                                {o.isCorrect ? <span style={{ fontSize: 11, fontWeight: 500, color: "#273FF9" }}>Correct</span> : null}
                              </div>
                            );
                          }
                          const selected = answers[q.id] === o.id;
                          return (
                            <div
                              key={o.id}
                              onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 11,
                                padding: "11px 13px",
                                borderRadius: 11,
                                fontSize: 14,
                                cursor: "pointer",
                                background: selected ? "rgba(58,99,250,.07)" : "rgba(255,255,255,.6)",
                                border: `1.5px solid ${selected ? "#273FF9" : "rgba(168,175,203,.3)"}`,
                              }}
                            >
                              <span
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 8,
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: selected ? "#fff" : "#596392",
                                  background: selected ? "#273FF9" : "rgba(168,175,203,.25)",
                                }}
                              >
                                {letter}
                              </span>
                              <span style={{ flex: 1, color: "#252944" }}>{o.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {revealAnswers && done.quizScore != null ? (
                <div style={{ fontSize: 13, color: "#596392", marginTop: 16 }}>
                  Score: <span style={{ fontWeight: 500, color: "#181835" }}>{done.quizScore}%</span>
                </div>
              ) : null}

              {questions.length > 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(168,175,203,.25)" }}>
                  {revealAnswers ? (
                    <MarkButton done label="Completed" onClick={() => undefined} />
                  ) : (
                    <button
                      onClick={submitQuizAnswers}
                      disabled={quizAction.isExecuting || Object.keys(answers).length < questions.length}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        height: 44,
                        padding: "0 20px",
                        font: "500 14px 'Switzer',sans-serif",
                        borderRadius: 12,
                        cursor: "pointer",
                        color: "#fff",
                        background: "linear-gradient(135deg,#3A63FA,#273FF9)",
                        border: "none",
                        boxShadow: "0 10px 24px rgba(39,63,249,.3)",
                        opacity: Object.keys(answers).length < questions.length ? 0.6 : 1,
                      }}
                    >
                      <iconify-icon icon="ant-design:check-outlined" width="15" />
                      {quizAction.isExecuting ? "Submitting…" : "Submit quiz"}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonItem({
  active,
  done,
  icon,
  title,
  meta,
  onClick,
}: {
  active: boolean;
  done: boolean;
  icon: string;
  title: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "10px 11px",
        borderRadius: 12,
        cursor: "pointer",
        background: active ? "rgba(255,255,255,.7)" : "transparent",
        border: `1px solid ${active ? "rgba(255,255,255,.85)" : "transparent"}`,
        boxShadow: active ? "0 6px 16px rgba(70,100,190,.1)" : "none",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 11,
          background: done ? "#273FF9" : "transparent",
          border: `1.5px solid ${done ? "#273FF9" : "rgba(168,175,203,.55)"}`,
        }}
      >
        {done ? <iconify-icon icon="ant-design:check-outlined" width="12" /> : null}
      </span>
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: "rgba(58,99,250,.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#273FF9",
          flexShrink: 0,
        }}
      >
        <iconify-icon icon={icon} width="16" />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#181835" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#767FA5" }}>{meta}</div>
      </div>
    </div>
  );
}

function MarkButton({ done, label, onClick }: { done: boolean; label?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={done}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 44,
        padding: "0 20px",
        font: "500 14px 'Switzer',sans-serif",
        borderRadius: 13,
        cursor: done ? "default" : "pointer",
        color: done ? "#273FF9" : "#fff",
        background: done ? "rgba(58,99,250,.12)" : "linear-gradient(135deg,#3A63FA,#273FF9)",
        border: done ? "1px solid rgba(58,99,250,.3)" : "none",
        boxShadow: done ? "none" : "0 10px 24px rgba(39,63,249,.3)",
      }}
    >
      <iconify-icon icon="ant-design:check-outlined" width="15" />
      {label ?? (done ? "Completed" : "Mark as completed")}
    </button>
  );
}
