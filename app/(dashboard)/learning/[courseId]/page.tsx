import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { toLearnerSafeQuiz } from "@/lib/quiz";
import { CourseViewer } from "@/components/learning/CourseViewer";

export default async function CoursePage({ params }: PageProps<"/learning/[courseId]">) {
  const { courseId } = await params;
  const actor = await getCurrentMember();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { article: true, questions: { include: { options: true }, orderBy: { order: "asc" } } },
  });
  if (!course) notFound();

  const progress = await prisma.learnerProgress.findUnique({
    where: { memberId_courseId: { memberId: actor.id, courseId } },
  });

  const canManage = course.ownerId === actor.id || actor.authRole === "admin" || actor.authRole === "hod";
  // The correct answer is only safe to reveal once the learner has already
  // submitted their own attempt, or to the course's own author/managers
  // previewing it — never to a learner who hasn't taken the quiz yet.
  const revealAnswers = canManage || !!progress?.quizDone;

  return (
    <CourseViewer
      courseId={course.id}
      category={course.category ?? "General"}
      title={course.title}
      level={course.level}
      duration={course.duration ?? "—"}
      videoUrl={course.videoUrl}
      summary={course.summary ?? ""}
      articleTitle={course.article?.title ?? course.title}
      articleSubtitle={course.article?.subtitle ?? null}
      articleBody={course.article?.bodyMarkdown ?? ""}
      questions={revealAnswers ? course.questions : toLearnerSafeQuiz(course.questions)}
      revealAnswers={revealAnswers}
      progress={{
        videoDone: progress?.videoDone ?? false,
        readingDone: progress?.readingDone ?? false,
        quizDone: progress?.quizDone ?? false,
        quizScore: progress?.quizScore ?? null,
      }}
      canManage={canManage}
    />
  );
}
