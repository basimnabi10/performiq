"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveCourse } from "@/actions/learning";
import { Button } from "@/components/ui/Button";
import { FrostCard } from "@/components/ui/FrostCard";

interface QuizOptionDraft {
  text: string;
  correct: boolean;
}
interface QuizQuestionDraft {
  text: string;
  options: QuizOptionDraft[];
}

export interface CourseFormInitial {
  id?: string;
  title: string;
  category: string;
  level: "core" | "advanced";
  duration: string;
  summary: string;
  videoUrl: string;
  articleTitle: string;
  articleSubtitle: string;
  articleBody: string;
  quiz: QuizQuestionDraft[];
}

const EMPTY: CourseFormInitial = {
  title: "",
  category: "Craft",
  level: "core",
  duration: "",
  summary: "",
  videoUrl: "",
  articleTitle: "",
  articleSubtitle: "",
  articleBody: "",
  quiz: [],
};

export function CourseForm({ initial }: { initial?: CourseFormInitial }) {
  const router = useRouter();
  const [form, setForm] = useState<CourseFormInitial>(initial ?? EMPTY);
  const { execute, isExecuting, result } = useAction(saveCourse, {
    onSuccess: ({ data }) => {
      if (data) router.push(`/learning/${data.courseId}`);
    },
  });

  function addQuestion() {
    setForm((f) => ({
      ...f,
      quiz: [...f.quiz, { text: "", options: [{ text: "", correct: true }, { text: "", correct: false }] }],
    }));
  }

  function updateQuestion(qi: number, patch: Partial<QuizQuestionDraft>) {
    setForm((f) => ({ ...f, quiz: f.quiz.map((q, i) => (i === qi ? { ...q, ...patch } : q)) }));
  }

  function updateOption(qi: number, oi: number, patch: Partial<QuizOptionDraft>) {
    setForm((f) => ({
      ...f,
      quiz: f.quiz.map((q, i) =>
        i !== qi ? q : { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) },
      ),
    }));
  }

  function setCorrect(qi: number, oi: number) {
    setForm((f) => ({
      ...f,
      quiz: f.quiz.map((q, i) =>
        i !== qi ? q : { ...q, options: q.options.map((o, j) => ({ ...o, correct: j === oi })) },
      ),
    }));
  }

  function removeQuestion(qi: number) {
    setForm((f) => ({ ...f, quiz: f.quiz.filter((_, i) => i !== qi) }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        execute({
          id: form.id,
          title: form.title,
          category: form.category || undefined,
          level: form.level,
          duration: form.duration || undefined,
          summary: form.summary || undefined,
          videoUrl: form.videoUrl || undefined,
          article: {
            title: form.articleTitle,
            subtitle: form.articleSubtitle || undefined,
            bodyMarkdown: form.articleBody,
          },
          quiz: form.quiz,
        });
      }}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <FrostCard style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="piq-h3">Course basics</div>
        <Field label="Title">
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required style={inputStyle} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Category">
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={inputStyle}>
              {["Craft", "Communication", "Leadership"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Level">
            <select
              value={form.level}
              onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as "core" | "advanced" }))}
              style={inputStyle}
            >
              <option value="core">Core</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
          <Field label="Duration">
            <input
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              placeholder="3h 20m"
              style={inputStyle}
            />
          </Field>
        </div>
        <Field label="Summary">
          <textarea value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} rows={2} style={inputStyle} />
        </Field>
        <Field label="Video URL">
          <input
            value={form.videoUrl}
            onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
            placeholder="https://…"
            style={inputStyle}
          />
        </Field>
      </FrostCard>

      <FrostCard style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="piq-h3">Article</div>
        <Field label="Article title">
          <input
            value={form.articleTitle}
            onChange={(e) => setForm((f) => ({ ...f, articleTitle: e.target.value }))}
            required
            style={inputStyle}
          />
        </Field>
        <Field label="Subtitle (optional)">
          <input
            value={form.articleSubtitle}
            onChange={(e) => setForm((f) => ({ ...f, articleSubtitle: e.target.value }))}
            style={inputStyle}
          />
        </Field>
        <Field label="Body (markdown)">
          <textarea
            value={form.articleBody}
            onChange={(e) => setForm((f) => ({ ...f, articleBody: e.target.value }))}
            required
            rows={8}
            style={inputStyle}
          />
        </Field>
      </FrostCard>

      <FrostCard style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="piq-h3">Quiz</div>
          <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
            Add question
          </Button>
        </div>
        {form.quiz.map((q, qi) => (
          <div key={qi} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "rgba(255,255,255,.3)", borderRadius: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={q.text}
                onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                placeholder={`Question ${qi + 1}`}
                required
                style={{ ...inputStyle, flex: 1 }}
              />
              <Button type="button" variant="text" size="sm" onClick={() => removeQuestion(qi)}>
                Remove
              </Button>
            </div>
            {q.options.map((o, oi) => (
              <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="radio" checked={o.correct} onChange={() => setCorrect(qi, oi)} />
                <input
                  value={o.text}
                  onChange={(e) => updateOption(qi, oi, { text: e.target.value })}
                  placeholder={`Option ${oi + 1}`}
                  required
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            ))}
          </div>
        ))}
      </FrostCard>

      {result.serverError ? (
        <div className="piq-caption" style={{ color: "#FF5A5F" }}>
          {result.serverError}
        </div>
      ) : null}

      <Button type="submit" disabled={isExecuting} style={{ width: 220 }}>
        {isExecuting ? "Publishing…" : "Publish course"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="piq-caption" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.75)",
  borderRadius: 11,
  padding: "10px 14px",
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 14,
  background: "rgba(255,255,255,.6)",
  outline: "none",
  color: "#181835",
  width: "100%",
};
