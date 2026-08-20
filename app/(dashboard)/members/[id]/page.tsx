import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentMember, requireSelfOrRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";
import { FrostCard } from "@/components/ui/FrostCard";
import { StatCard } from "@/components/ui/StatCard";
import { Tag } from "@/components/ui/Tag";
import { DesignationModal } from "@/components/members/DesignationModal";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  invited: "Invitation pending",
};

export default async function MemberProfilePage({ params }: PageProps<"/members/[id]">) {
  const { id } = await params;
  const actor = await getCurrentMember();

  // requireSelfOrRole re-derives the target's department/team from the DB
  // and checks the requester's scope against it — an id existing is never
  // sufficient on its own (IDOR prevention).
  await requireSelfOrRole(actor, id, ["admin", "hod", "manager"]);

  const member = await prisma.member.findUnique({
    where: { id },
    include: { team: { select: { name: true } }, department: { select: { name: true } } },
  });
  if (!member) notFound();

  const canEdit = actor.authRole === "admin" || actor.authRole === "hod" || actor.authRole === "manager";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/members" className="piq-caption" style={{ textDecoration: "none" }}>
        ← Back to members
      </Link>

      <FrostCard tone="ink" style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Avatar name={member.name} size={72} round />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="piq-h1" style={{ color: "#fff" }}>
              {member.name}
            </span>
            <Tag tone={member.status === "active" ? "onTrack" : "neutral"} dot>
              {STATUS_LABEL[member.status]}
            </Tag>
          </div>
          <div style={{ color: "#A8AFCB", fontSize: 14, marginTop: 4 }}>
            {member.jobTitle ?? "No title set"} · {member.team?.name ?? "Unassigned"}
          </div>
          {canEdit ? (
            <div style={{ marginTop: 10 }}>
              <DesignationModal memberId={member.id} currentTitle={member.jobTitle ?? ""} />
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 18, marginTop: 16, color: "#767FA5", fontSize: 13 }}>
            <span>{member.email}</span>
            {member.location ? <span>{member.location}</span> : null}
            {member.empId ? <span>ID {member.empId}</span> : null}
          </div>
        </div>
      </FrostCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
        <StatCard label="Department" value={member.department?.name ?? "—"} icon="ant-design:apartment-outlined" />
        <StatCard label="KPIs on target" value="—" icon="ant-design:aim-outlined" />
        <StatCard label="Reviews completed" value="—" icon="ant-design:file-done-outlined" />
      </div>

      <div className="piq-caption">
        KPI breakdown and review history light up once KPIs and review cycles are wired up
        (next build phase).
      </div>
    </div>
  );
}
