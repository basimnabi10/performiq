import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { OrganizationSettingsForm } from "@/components/settings/OrganizationSettingsForm";
import { DepartmentManager } from "@/components/settings/DepartmentManager";

export default async function SettingsPage() {
  const actor = await getCurrentMember();
  if (actor.authRole !== "admin") {
    redirect("/my-dashboard");
  }

  const [organization, departments] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: actor.orgId } }),
    prisma.department.findMany({
      where: { orgId: actor.orgId },
      orderBy: { name: "asc" },
      include: { _count: { select: { teams: true, members: true } } },
    }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 720 }}>
      <div className="piq-h1">Settings</div>

      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div className="piq-h2">Organization</div>
          <div className="piq-caption">This name appears in the sidebar and on member invites.</div>
        </div>
        <OrganizationSettingsForm currentName={organization.name} />
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div className="piq-h2">Departments</div>
          <div className="piq-caption">Departments group teams under an HOD. Rename or add new ones as your org grows.</div>
        </div>
        <DepartmentManager
          departments={departments.map((d) => ({
            id: d.id,
            name: d.name,
            teamCount: d._count.teams,
            memberCount: d._count.members,
          }))}
        />
      </section>
    </div>
  );
}
