import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { FrostCard } from "@/components/ui/FrostCard";
import { StatCard } from "@/components/ui/StatCard";
import { StartCycleModal } from "@/components/cycles/StartCycleModal";
import { LessonApprovalList } from "@/components/learning/LessonApprovalList";
import { TeamMoodWidget } from "@/components/dashboard/TeamMoodWidget";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export default async function HodDashboardPage() {
  const member = await getCurrentMember();
  if (member.authRole !== "admin" && member.authRole !== "hod") {
    redirect("/my-dashboard");
  }

  const scopeWhere =
    member.authRole === "admin"
      ? { orgId: member.orgId }
      : { orgId: member.orgId, departmentId: member.departmentId };

  const [teams, memberCount, invitedCount, activeCycle] = await Promise.all([
    prisma.team.findMany({
      where: member.authRole === "admin" ? { orgId: member.orgId } : { departmentId: member.departmentId ?? "" },
      include: { _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.member.count({ where: scopeWhere }),
    prisma.member.count({ where: { ...scopeWhere, status: "invited" } }),
    prisma.reviewCycle.findFirst({
      where:
        member.authRole === "admin"
          ? { orgId: member.orgId, status: "in_progress" }
          : { orgId: member.orgId, status: "in_progress", departmentId: member.departmentId },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const scopeMemberFilter =
    member.authRole === "admin" ? { orgId: member.orgId } : { departmentId: member.departmentId };

  const [pendingLessonRequests, todaysMoods, recentActivity] = await Promise.all([
    prisma.lessonRequest.findMany({
      where: { status: "pending", member: scopeMemberFilter },
      include: { member: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.moodCheckin.findMany({
      where: { date: todayDateOnly(), member: scopeMemberFilter },
      include: { member: { select: { name: true } } },
    }),
    prisma.auditLog.findMany({
      where: { orgId: member.orgId, actor: scopeMemberFilter },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <FrostCard tone="ink" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div className="piq-display" style={{ color: "#fff" }}>
            {member.authRole === "admin" ? "Organization overview" : "Department overview"}
          </div>
          <div className="piq-body" style={{ color: "#A8AFCB", marginTop: 4 }}>
            {activeCycle ? `${activeCycle.label} is in progress.` : "No review cycle is currently active."}
          </div>
        </div>
        {!activeCycle ? <StartCycleModal departmentId={member.authRole === "hod" ? member.departmentId ?? undefined : undefined} /> : null}
      </FrostCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
        <StatCard label="Total members" value={memberCount} icon="ant-design:team-outlined" />
        <StatCard label="Pending invitations" value={invitedCount} icon="ant-design:mail-outlined" />
        <StatCard label="Teams" value={teams.length} icon="ant-design:apartment-outlined" />
        <StatCard label="Active review cycle" value={activeCycle ? "In progress" : "None"} icon="ant-design:sync-outlined" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 18 }}>
        {teams.map((team) => (
          <FrostCard key={team.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="piq-h3">{team.name}</div>
            <div className="piq-caption">{team._count.members} members</div>
          </FrostCard>
        ))}
      </div>

      <FrostCard>
        <div className="piq-h3" style={{ marginBottom: 10 }}>
          Lesson requests
        </div>
        <LessonApprovalList
          requests={pendingLessonRequests.map((r) => ({ id: r.id, memberName: r.member.name, topic: r.topic }))}
        />
      </FrostCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <FrostCard>
          <div className="piq-h3" style={{ marginBottom: 10 }}>
            Team mood today
          </div>
          <TeamMoodWidget
            entries={todaysMoods.map((m) => ({ memberName: m.member.name, value: m.value, reason: m.reason }))}
          />
        </FrostCard>
        <FrostCard>
          <div className="piq-h3" style={{ marginBottom: 10 }}>
            Recent activity
          </div>
          <ActivityFeed
            entries={recentActivity.map((a) => ({ id: a.id, actorName: a.actor.name, verb: a.verb, createdAt: a.createdAt }))}
          />
        </FrostCard>
      </div>
    </div>
  );
}
