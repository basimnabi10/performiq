import Link from "next/link";
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/learning" className="piq-caption" style={{ textDecoration: "none" }}>
        ← Back to learning
      </Link>

      <div>
        <div className="piq-h1">{course.title}</div>
        <div className="piq-caption">
          {course.category} · {course.level} · {course.duration}
        </div>
      </div>

      <CourseViewer
        courseId={course.id}
        videoUrl={course.videoUrl}
        articleTitle={course.article?.title ?? course.title}
        articleSubtitle={course.article?.subtitle ?? null}
        articleBody={course.article?.bodyMarkdown ?? ""}
        questions={toLearnerSafeQuiz(course.questions)}
        progress={{
          videoDone: progress?.videoDone ?? false,
          readingDone: progress?.readingDone ?? false,
          quizDone: progress?.quizDone ?? false,
          quizScore: progress?.quizScore ?? null,
        }}
        canManage={canManage}
      />
    </div>
  );
}
