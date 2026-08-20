import Link from "next/link";
import { AuthzError, getCurrentMember, requireCanAuthorCourses } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { FrostCard } from "@/components/ui/FrostCard";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { AssignLearningModal } from "@/components/learning/AssignLearningModal";
import { LessonRequestForm } from "@/components/learning/LessonRequestForm";

export default async function LearningPage() {
  const actor = await getCurrentMember();

  let canAuthor = true;
  try {
    await requireCanAuthorCourses(actor);
  } catch (e) {
    if (e instanceof AuthzError) canAuthor = false;
    else throw e;
  }

  const courses = await prisma.course.findMany({
    where: { orgId: actor.orgId, status: "published" },
    include: { _count: { select: { assignments: true } } },
    orderBy: { createdAt: "desc" },
  });

  const canManage = actor.authRole === "admin" || actor.authRole === "hod" || actor.authRole === "manager";

  const scopedMembers = canManage
    ? await prisma.member.findMany({
        where:
          actor.authRole === "admin"
            ? { orgId: actor.orgId }
            : actor.authRole === "hod"
              ? { departmentId: actor.departmentId }
              : { teamId: actor.teamId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const assignments = canManage
    ? await prisma.learningAssignment.findMany({
        where: {
          member:
            actor.authRole === "admin"
              ? { orgId: actor.orgId }
              : actor.authRole === "hod"
                ? { departmentId: actor.departmentId }
                : { teamId: actor.teamId },
        },
        include: { member: { select: { name: true } }, course: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  const myRequests = actor.authRole === "ic"
    ? await prisma.lessonRequest.findMany({ where: { memberId: actor.id }, orderBy: { createdAt: "desc" } })
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="piq-h1">Learning</div>
          <div className="piq-caption">
            {courses.length} course{courses.length === 1 ? "" : "s"} published
          </div>
        </div>
        {canAuthor ? (
          <Link href="/learning/new">
            <Button icon="ant-design:plus-outlined">Create a lesson</Button>
          </Link>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
        {courses.map((course) => (
          <FrostCard key={course.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Tag tone="frost">{course.category ?? "General"}</Tag>
              <span className="piq-caption">{course.duration}</span>
            </div>
            <Link href={`/learning/${course.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="piq-h3">{course.title}</div>
            </Link>
            <div className="piq-caption">{course.summary}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <span className="piq-caption">{course._count.assignments} assigned</span>
              {canManage ? <AssignLearningModal courseId={course.id} members={scopedMembers} /> : null}
            </div>
          </FrostCard>
        ))}
      </div>

      {actor.authRole === "ic" && !canAuthor ? (
        <FrostCard>
          <LessonRequestForm requests={myRequests.map((r) => ({ id: r.id, topic: r.topic, status: r.status }))} />
        </FrostCard>
      ) : null}

      {canManage ? (
        <FrostCard>
          <div className="piq-h3" style={{ marginBottom: 10 }}>
            Assignments
          </div>
          {assignments.length === 0 ? (
            <div className="piq-caption">No learning assignments yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 480 }}>
                {assignments.map((a) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                    <span style={{ width: 160, flexShrink: 0 }}>{a.member.name}</span>
                    <span style={{ flex: 1, minWidth: 120 }}>{a.course.title}</span>
                    <span style={{ width: 100, flexShrink: 0 }}>{a.progressPct}%</span>
                    <span style={{ flexShrink: 0 }}>
                      <Tag tone={a.status === "completed" ? "complete" : a.status === "in_progress" ? "onTrack" : "neutral"} dot>
                        {a.status}
                      </Tag>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </FrostCard>
      ) : null}
    </div>
  );
}
