"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { AuthzError, requireCanAuthorCourses, requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { assertSafeMarkdown } from "@/lib/sanitize";
import { gradeQuizAttempt } from "@/lib/quiz";
import { logActivity } from "@/lib/audit";
import {
  assignCourseSchema,
  deleteCourseSchema,
  markLessonStepSchema,
  saveCourseSchema,
  submitQuizSchema,
} from "@/lib/validation/learning.schema";

export const saveCourse = authActionClient
  .schema(saveCourseSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    await requireCanAuthorCourses(actor);
    assertSafeMarkdown(parsedInput.article.bodyMarkdown);

    if (parsedInput.id) {
      const existing = await prisma.course.findUnique({ where: { id: parsedInput.id } });
      if (!existing) throw new Error("Course not found.");
      // admin/hod can edit any course; manager/ic can only edit their own.
      const canEditAny = actor.authRole === "admin" || actor.authRole === "hod";
      if (!canEditAny && existing.ownerId !== actor.id) {
        throw new AuthzError("Only the course owner can edit it.");
      }
    }

    const course = await prisma.$transaction(async (tx) => {
      const saved = parsedInput.id
        ? await tx.course.update({
            where: { id: parsedInput.id },
            data: {
              title: parsedInput.title,
              category: parsedInput.category,
              level: parsedInput.level,
              duration: parsedInput.duration,
              summary: parsedInput.summary,
              videoUrl: parsedInput.videoUrl,
              videoDurationSec: parsedInput.videoDurationSec,
              status: "published",
            },
          })
        : await tx.course.create({
            data: {
              orgId: actor.orgId,
              ownerId: actor.id,
              title: parsedInput.title,
              category: parsedInput.category,
              level: parsedInput.level,
              duration: parsedInput.duration,
              summary: parsedInput.summary,
              videoUrl: parsedInput.videoUrl,
              videoDurationSec: parsedInput.videoDurationSec,
              status: "published",
            },
          });

      await tx.courseArticle.upsert({
        where: { courseId: saved.id },
        create: {
          courseId: saved.id,
          title: parsedInput.article.title,
          subtitle: parsedInput.article.subtitle,
          bodyMarkdown: parsedInput.article.bodyMarkdown,
        },
        update: {
          title: parsedInput.article.title,
          subtitle: parsedInput.article.subtitle,
          bodyMarkdown: parsedInput.article.bodyMarkdown,
        },
      });

      // Simplest correct approach for a small quiz: replace wholesale on every save.
      await tx.quizQuestion.deleteMany({ where: { courseId: saved.id } });
      for (let i = 0; i < parsedInput.quiz.length; i++) {
        const q = parsedInput.quiz[i];
        await tx.quizQuestion.create({
          data: {
            courseId: saved.id,
            order: i,
            text: q.text,
            options: {
              create: q.options.map((o, j) => ({ text: o.text, isCorrect: o.correct, order: j })),
            },
          },
        });
      }

      return saved;
    });

    revalidatePath("/learning");
    revalidatePath(`/learning/${course.id}`);
    return { courseId: course.id };
  });

export const deleteCourse = authActionClient
  .schema(deleteCourseSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    const course = await prisma.course.findUnique({ where: { id: parsedInput.courseId } });
    if (!course) throw new Error("Course not found.");
    if (course.ownerId !== actor.id) {
      requireRole(actor, ["admin", "hod"]);
    }
    await prisma.course.delete({ where: { id: parsedInput.courseId } });
    revalidatePath("/learning");
  });

export const assignCourse = authActionClient
  .schema(assignCourseSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod", "manager"]);

    const members = await prisma.member.findMany({ where: { id: { in: parsedInput.memberIds } } });
    for (const m of members) {
      await requireScopeAccess(actor, { teamId: m.teamId, departmentId: m.departmentId });
    }

    await prisma.$transaction(
      members.map((m) =>
        prisma.learningAssignment.upsert({
          where: { memberId_courseId: { memberId: m.id, courseId: parsedInput.courseId } },
          create: {
            memberId: m.id,
            courseId: parsedInput.courseId,
            assignedById: actor.id,
            dueDate: parsedInput.dueDate ? new Date(parsedInput.dueDate) : undefined,
            status: "not_started",
          },
          update: {
            dueDate: parsedInput.dueDate ? new Date(parsedInput.dueDate) : undefined,
          },
        }),
      ),
    );

    revalidatePath("/learning");
    return { assigned: members.length };
  });

export const markLessonStep = authActionClient
  .schema(markLessonStepSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;

    const progress = await prisma.learnerProgress.upsert({
      where: { memberId_courseId: { memberId: actor.id, courseId: parsedInput.courseId } },
      create: {
        memberId: actor.id,
        courseId: parsedInput.courseId,
        videoDone: parsedInput.step === "video",
        readingDone: parsedInput.step === "reading",
      },
      update: {
        ...(parsedInput.step === "video" ? { videoDone: true } : {}),
        ...(parsedInput.step === "reading" ? { readingDone: true } : {}),
      },
    });

    await syncAssignmentProgress(actor.orgId, actor.id, parsedInput.courseId, progress);
    revalidatePath(`/learning/${parsedInput.courseId}`);
  });

export const submitQuiz = authActionClient
  .schema(submitQuizSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;

    const questions = await prisma.quizQuestion.findMany({
      where: { courseId: parsedInput.courseId },
      include: { options: true },
      orderBy: { order: "asc" },
    });

    const { score } = gradeQuizAttempt(questions, parsedInput.answers);

    const progress = await prisma.learnerProgress.upsert({
      where: { memberId_courseId: { memberId: actor.id, courseId: parsedInput.courseId } },
      create: { memberId: actor.id, courseId: parsedInput.courseId, quizDone: true, quizScore: score },
      update: { quizDone: true, quizScore: score },
    });

    await syncAssignmentProgress(actor.orgId, actor.id, parsedInput.courseId, progress);
    revalidatePath(`/learning/${parsedInput.courseId}`);
    return { score };
  });

async function syncAssignmentProgress(
  orgId: string,
  memberId: string,
  courseId: string,
  progress: { videoDone: boolean; readingDone: boolean; quizDone: boolean },
) {
  const doneCount = [progress.videoDone, progress.readingDone, progress.quizDone].filter(Boolean).length;
  const progressPct = Math.round((doneCount / 3) * 100);
  const status = doneCount === 3 ? "completed" : doneCount > 0 ? "in_progress" : "not_started";

  await prisma.learningAssignment.updateMany({
    where: { memberId, courseId },
    data: { progressPct, status },
  });

  if (doneCount === 3) {
    await prisma.learnerProgress.update({
      where: { memberId_courseId: { memberId, courseId } },
      data: { completedAt: new Date() },
    });

    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
    await logActivity({
      orgId,
      actorId: memberId,
      verb: "completed a course",
      targetType: "Course",
      targetId: courseId,
      metadata: { title: course?.title },
    });
  }
}
