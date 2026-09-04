import { redirect } from "next/navigation";
import { AuthzError, getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  hod: "Head of Product",
  manager: "Team Manager",
  ic: "Contributor",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let member;
  try {
    member = await getCurrentMember();
  } catch (e) {
    if (e instanceof AuthzError) redirect("/login");
    throw e;
  }

  const [organization, department, team] = await Promise.all([
    prisma.organization.findUnique({ where: { id: member.orgId }, select: { name: true } }),
    member.departmentId
      ? prisma.department.findUnique({ where: { id: member.departmentId }, select: { name: true } })
      : Promise.resolve(null),
    member.teamId
      ? prisma.team.findUnique({ where: { id: member.teamId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  const isManager = member.authRole === "admin" || member.authRole === "hod";

  const sections = isManager
    ? [
        { label: "Overview", items: [{ href: "/hod-dashboard", label: "Dashboard", icon: "ant-design:dashboard-outlined" }] },
        {
          label: department ? `${department.name} Department` : "Department",
          items: [
            { href: "/teams", label: "Teams", icon: "ant-design:team-outlined" },
            { href: "/members", label: "Members", icon: "ant-design:user-outlined" },
          ],
        },
        { label: "Reviews", items: [{ href: "/reviews", label: "Reviews", icon: "ant-design:file-done-outlined" }] },
        {
          label: "Performance",
          items: [
            { href: "/kpis", label: "KPIs", icon: "ant-design:bar-chart-outlined" },
            { href: "/analytics", label: "Analytics", icon: "ant-design:line-chart-outlined" },
            { href: "/learning", label: "Learning", icon: "ant-design:read-outlined" },
          ],
        },
        ...(member.authRole === "admin"
          ? [{ label: "Admin", items: [{ href: "/settings", label: "Settings", icon: "ant-design:setting-outlined" }] }]
          : []),
      ]
    : member.authRole === "manager"
      ? [
          { label: "Overview", items: [{ href: "/my-dashboard", label: "Dashboard", icon: "ant-design:dashboard-outlined" }] },
          {
            label: team ? team.name : "My Team",
            items: [
              ...(member.teamId
                ? [{ href: `/teams/${member.teamId}`, label: "Team", icon: "ant-design:team-outlined" }]
                : []),
              { href: "/members", label: "Members", icon: "ant-design:user-outlined" },
            ],
          },
          { label: "Reviews", items: [{ href: "/reviews", label: "Reviews", icon: "ant-design:file-done-outlined" }] },
          {
            label: "Performance",
            items: [
              { href: "/analytics", label: "Analytics", icon: "ant-design:line-chart-outlined" },
              { href: "/learning", label: "Learning", icon: "ant-design:read-outlined" },
            ],
          },
        ]
      : [
          {
            label: "Me",
            items: [{ href: "/my-dashboard", label: "My dashboard", icon: "ant-design:dashboard-outlined" }],
          },
          { label: "Growth", items: [{ href: "/learning", label: "Learning", icon: "ant-design:read-outlined" }] },
        ];

  const workspaceLabel = isManager
    ? department?.name ?? "Department"
    : team?.name ?? "Workspace";
  const workspaceSub = isManager ? "Department workspace" : member.authRole === "manager" ? "Team workspace" : "Your workspace";
  const workspaceIcon = isManager ? "ant-design:appstore-outlined" : "ant-design:bg-colors-outlined";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        orgName={organization?.name ?? "PerformIQ"}
        workspaceLabel={workspaceLabel}
        workspaceSub={workspaceSub}
        workspaceIcon={workspaceIcon}
        name={member.name}
        role={ROLE_LABEL[member.authRole] ?? member.authRole}
        sections={sections}
        switchViewHref={isManager ? "/my-dashboard" : undefined}
        switchViewLabel="Switch to member view"
      />
      <main style={{ flex: 1, minWidth: 0, padding: "26px 30px", display: "flex", flexDirection: "column", gap: 24 }}>
        {children}
      </main>
    </div>
  );
}
