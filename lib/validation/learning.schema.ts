import { z } from "zod";

const quizOptionInput = z.object({
  text: z.string().trim().min(1, { error: "Enter an option." }).max(200),
  correct: z.boolean(),
});

const quizQuestionInput = z.object({
  text: z.string().trim().min(1, { error: "Enter a question." }).max(300),
  options: z.array(quizOptionInput).min(2, { error: "Add at least two options." }).max(6),
});

export const saveCourseSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, { error: "Enter a title." }).max(100),
  category: z.string().trim().max(40).optional(),
  level: z.enum(["core", "advanced"]),
  duration: z.string().trim().max(20).optional(),
  summary: z.string().trim().max(300).optional(),
  videoUrl: z.string().trim().max(300).optional(),
  videoDurationSec: z.number().int().min(0).optional(),
  article: z.object({
    title: z.string().trim().min(2, { error: "Enter an article title." }).max(100),
    subtitle: z.string().trim().max(150).optional(),
    bodyMarkdown: z.string().trim().min(1, { error: "Write the article body." }),
  }),
  quiz: z.array(quizQuestionInput).max(20).default([]),
});

export const assignCourseSchema = z.object({
  courseId: z.string().min(1),
  memberIds: z.array(z.string().min(1)).min(1, { error: "Select at least one member." }),
  dueDate: z.string().optional(),
});

export const markLessonStepSchema = z.object({
  courseId: z.string().min(1),
  step: z.enum(["video", "reading"]),
});

export const submitQuizSchema = z.object({
  courseId: z.string().min(1),
  answers: z.array(
    z.object({ questionId: z.string().min(1), selectedOptionId: z.string().min(1) }),
  ),
});

export const deleteCourseSchema = z.object({ courseId: z.string().min(1) });
