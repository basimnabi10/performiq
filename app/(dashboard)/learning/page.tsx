import Link from "next/link";
import { AuthzError, getCurrentMember, requireCanAuthorCourses } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { AssignLearningModal } from "@/components/learning/AssignLearningModal";
import { LearningExplorer } from "@/components/learning/LearningExplorer";
import { LessonRequestForm } from "@/components/learning/LessonRequestForm";

const LEVEL_LABEL: Record<string, string> = { core: "Core", advanced: "Advanced" };

export default async function LearningPage() {
  const actor = await getCurrentMember();

  let canAuthor = true;
  try {
    await requireCanAuthorCourses(actor);
  } catch (e) {
    if (e instanceof AuthzError) canAuthor = false;
    else throw e;
  }

  const isOrgWide = actor.authRole === "admin";
  const departmentName = isOrgWide
    ? "Organization"
    : (await prisma.department.findUnique({ where: { id: actor.departmentId ?? "" }, select: { name: true } }))?.name ?? "Department";

  const canManage = actor.authRole === "admin" || actor.authRole === "hod" || actor.authRole === "manager";

  const memberScopeWhere = isOrgWide
    ? { orgId: actor.orgId }
    : actor.authRole === "hod"
      ? { departmentId: actor.departmentId }
      : { teamId: actor.teamId };

  const [courses, teams, scopedMembers, assignments] = await Promise.all([
    prisma.course.findMany({
      where: { orgId: actor.orgId, status: "published" },
      orderBy: { createdAt: "desc" },
    }),
    canManage
      ? prisma.team.findMany({
          where: isOrgWide ? { orgId: actor.orgId } : { departmentId: actor.departmentId ?? "" },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    canManage
      ? prisma.member.findMany({ where: memberScopeWhere, select: { id: true, name: true, teamId: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    canManage
      ? prisma.learningAssignment.findMany({
          where: { member: memberScopeWhere },
          include: { member: { select: { name: true, team: { select: { name: true } } } }, course: { select: { title: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const myRequests =
    actor.authRole === "ic"
      ? await prisma.lessonRequest.findMany({ where: { memberId: actor.id }, orderBy: { createdAt: "desc" } })
      : [];

  const courseRows = courses.map((c) => {
    const courseAssignments = assignments.filter((a) => a.course.title === c.title);
    return {
      id: c.id,
      title: c.title,
      category: c.category ?? "General",
      duration: c.duration ?? "—",
      level: LEVEL_LABEL[c.level] ?? c.level,
      icon: c.icon ?? "ant-design:play-circle-outlined",
      assigned: courseAssignments.length,
      completed: courseAssignments.filter((a) => a.status === "completed").length,
    };
  });

  const assignmentRows = assignments.map((a) => ({
    id: a.id,
    memberName: a.member.name,
    teamName: a.member.team?.name ?? "Unassigned",
    courseTitle: a.course.title,
    due: a.dueDate ? a.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No due date",
    progressPct: a.progressPct,
    status: a.status,
  }));

  const completedCount = assignments.filter((a) => a.status === "completed").length;
  const inProgressCount = assignments.filter((a) => a.status === "in_progress").length;
  const notStartedCount = assignments.filter((a) => a.status === "not_started").length;
  const completionRate = assignments.length ? `${Math.round((completedCount / assignments.length) * 100)}%` : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, color: "#767FA5", fontWeight: 500 }}>{departmentName}</div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", marginTop: 2 }}>Learning</div>
          <div style={{ fontSize: 14, color: "#596392", marginTop: 3 }}>
            {courses.length} course{courses.length === 1 ? "" : "s"} · {assignments.length} active assignment
            {assignments.length === 1 ? "" : "s"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {canAuthor ? (
            <Link href="/learning/new" style={{ textDecoration: "none" }}>
              <Button variant="secondary" icon="ant-design:video-camera-add-outlined">
                Create course
              </Button>
            </Link>
          ) : null}
          {canManage && courses.length > 0 ? (
            <AssignLearningModal
              courses={courses.map((c) => ({ id: c.id, title: c.title }))}
              teams={teams}
              members={scopedMembers}
            />
          ) : null}
        </div>
      </div>

      {canManage ? (
        <div style={{ display: "flex", gap: 16 }}>
          <SummaryCard label="Completion rate" value={completionRate} />
          <SummaryCard label="Assigned" value={String(assignments.length)} />
          <SummaryCard label="In progress" value={String(inProgressCount)} />
          <SummaryCard label="Overdue / not started" value={String(notStartedCount)} />
        </div>
      ) : null}

      {canManage ? (
        <LearningExplorer courses={courseRows} assignments={assignmentRows} teams={teams} members={scopedMembers} canManage={canAuthor} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {courseRows.map((c) => (
            <Link key={c.id} href={`/learning/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div
                style={{
                  background: "rgba(255,255,255,.20)",
                  border: "1px solid rgba(255,255,255,.40)",
                  WebkitBackdropFilter: "blur(35px)",
                  backdropFilter: "blur(35px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,.06)",
                  borderRadius: 20,
                  padding: 20,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                }}
              >
                <span
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 13,
                    background: "rgba(58,99,250,.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#273FF9",
                    flexShrink: 0,
                  }}
                >
                  <iconify-icon icon={c.icon} width="22" />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#181835" }}>{c.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: "#596392", background: "rgba(89,99,146,.12)", padding: "3px 9px", borderRadius: 7 }}>
                      {c.category}
                    </span>
                    <span style={{ fontSize: 11, color: "#767FA5" }}>{c.duration}</span>
                    <span style={{ fontSize: 11, color: "#767FA5" }}>· {c.level}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {actor.authRole === "ic" && !canAuthor ? (
        <div
          style={{
            background: "rgba(255,255,255,.20)",
            border: "1px solid rgba(255,255,255,.40)",
            WebkitBackdropFilter: "blur(35px)",
            backdropFilter: "blur(35px)",
            boxShadow: "0 8px 24px rgba(0,0,0,.06)",
            borderRadius: 20,
            padding: 20,
          }}
        >
          <LessonRequestForm requests={myRequests.map((r) => ({ id: r.id, topic: r.topic, status: r.status }))} />
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: "rgba(255,255,255,.20)",
        border: "1px solid rgba(255,255,255,.40)",
        WebkitBackdropFilter: "blur(35px)",
        backdropFilter: "blur(35px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        borderRadius: 18,
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: 12, color: "#767FA5" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 500, color: "#181835", fontVariantNumeric: "tabular-nums", marginTop: 4 }}>{value}</div>
    </div>
  );
}
