import { redirect } from "next/navigation";
import { AuthzError, getCurrentMember, requireCanAuthorCourses } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { CourseForm, type CourseFormInitial } from "@/components/learning/CourseForm";

export default async function NewCoursePage({ searchParams }: PageProps<"/learning/new">) {
  const { edit } = await searchParams;
  const editId = Array.isArray(edit) ? edit[0] : edit;
  const actor = await getCurrentMember();

  try {
    await requireCanAuthorCourses(actor);
  } catch (e) {
    if (e instanceof AuthzError) redirect("/learning");
    throw e;
  }

  let initial: CourseFormInitial | undefined;
  if (editId) {
    const course = await prisma.course.findUnique({
      where: { id: editId },
      include: { article: true, questions: { include: { options: true }, orderBy: { order: "asc" } } },
    });
    const canEditAny = actor.authRole === "admin" || actor.authRole === "hod";
    if (course && (course.ownerId === actor.id || canEditAny)) {
      initial = {
        id: course.id,
        title: course.title,
        category: course.category ?? "Craft",
        level: course.level,
        duration: course.duration ?? "",
        summary: course.summary ?? "",
        videoUrl: course.videoUrl ?? "",
        articleTitle: course.article?.title ?? "",
        articleSubtitle: course.article?.subtitle ?? "",
        articleBody: course.article?.bodyMarkdown ?? "",
        quiz: course.questions.map((q) => ({
          text: q.text,
          options: q.options.map((o) => ({ text: o.text, correct: o.isCorrect })),
        })),
      };
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <div className="piq-h1">{initial ? "Edit course" : "Create a lesson"}</div>
      <CourseForm initial={initial} />
    </div>
  );
}
