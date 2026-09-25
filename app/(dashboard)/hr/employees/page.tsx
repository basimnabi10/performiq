import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { HrEmployeeTable, type HrEmployeeRow } from "@/components/hr/HrEmployeeTable";

/**
 * The staff record, independent of any one month.
 *
 * Everyone appears, including people who have never been reviewed — a
 * directory that quietly omitted them would be the one place HR could not
 * notice someone had been missed.
 */
export default async function HrEmployeesPage() {
  const actor = await getCurrentMember();
  if (actor.authRole !== "hr" && actor.authRole !== "admin") redirect("/dashboard");

  const members = await prisma.member.findMany({
    where: { orgId: actor.orgId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      jobTitle: true,
      empId: true,
      location: true,
      workType: true,
      joinedDate: true,
      authRole: true,
      authUserId: true,
      department: { select: { name: true } },
      team: { select: { name: true } },
      manager: { select: { name: true } },
    },
  });

  // Submitted reviews only: a draft is not a judgement, so it is not part of
  // anyone's record yet.
  const completed = await prisma.review.findMany({
    where: { reviewee: { orgId: actor.orgId }, status: "completed" },
    select: { revieweeId: true, overallScore: true, submittedAt: true },
  });

  const stats = new Map<string, { count: number; sum: number; last: Date | null }>();
  for (const r of completed) {
    const row = stats.get(r.revieweeId) ?? { count: 0, sum: 0, last: null };
    row.count += 1;
    row.sum += Number(r.overallScore ?? 0);
    if (r.submittedAt && (!row.last || r.submittedAt > row.last)) row.last = r.submittedAt;
    stats.set(r.revieweeId, row);
  }

  const rows: HrEmployeeRow[] = members.map((m) => {
    const s = stats.get(m.id);
    return {
      id: m.id,
      name: m.name,
      email: m.email,
      avatarUrl: m.avatarUrl,
      jobTitle: m.jobTitle,
      empId: m.empId,
      location: m.location,
      workType: m.workType,
      departmentName: m.department?.name ?? null,
      teamName: m.team?.name ?? null,
      managerName: m.manager?.name ?? null,
      role: m.authRole,
      activated: m.authUserId != null,
      joinedLabel: m.joinedDate
        ? m.joinedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        : null,
      reviewCount: s?.count ?? 0,
      averageScore: s && s.count ? s.sum / s.count : null,
      lastReviewedLabel: s?.last
        ? s.last.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        : null,
    };
  });

  const departments = [...new Set(rows.map((r) => r.departmentName).filter((d): d is string => !!d))].sort();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div style={{ fontSize: 13, color: "#767FA5", fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>
          Organization · Read-only
        </div>
        <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", marginTop: 4 }}>
          Employees
        </div>
        <div style={{ fontSize: 14, color: "#596392", marginTop: 4, maxWidth: 620, lineHeight: 1.55 }}>
          Everyone on the platform, with how many reviews they have on record. Open a person for their full history.
        </div>
      </div>

      <HrEmployeeTable rows={rows} departments={departments} />
    </div>
  );
}
