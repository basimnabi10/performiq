import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { MonthPicker, type MonthOption } from "@/components/cycles/MonthPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Panel, Progress, StatCard } from "@/components/hr/HrPanels";

/**
 * HR's month view of the review record.
 *
 * Read-only by construction: HR appears in no `requireRole` allowlist, so
 * every Server Action refuses it, and this page renders no control that
 * writes. Two things are deliberately absent — coaching notes, and the
 * written reason on a check-in. Both were promised to stay between a member
 * and their manager, and HR reading them would quietly break that.
 *
 * Only submitted reviews carry scores here. A draft is someone's unfinished
 * thinking, not a judgement, so outstanding work is shown as a count to chase
 * rather than as numbers to read.
 */
export default async function HrOverviewPage({ searchParams }: PageProps<"/hr">) {
  const actor = await getCurrentMember();
  if (actor.authRole !== "hr" && actor.authRole !== "admin") redirect("/dashboard");

  const { month: rawMonth } = await searchParams;
  const monthParam = Array.isArray(rawMonth) ? rawMonth[0] : rawMonth;

  const cycles = await prisma.reviewCycle.findMany({
    where: { orgId: actor.orgId },
    orderBy: { startDate: "desc" },
    include: { department: { select: { name: true } }, team: { select: { name: true } } },
  });

  // One row per period, not per cycle: every department runs its own cycle for
  // the same month, so September would otherwise appear four times.
  const monthOptions: MonthOption[] = [];
  for (const c of cycles) {
    const key = `${c.year}-${String(c.month).padStart(2, "0")}`;
    const existing = monthOptions.find((m) => m.key === key);
    if (!existing) {
      monthOptions.push({ key, label: c.label, status: c.status });
    } else if (c.status === "in_progress" && existing.status !== "in_progress") {
      existing.status = "in_progress";
    }
  }

  const selectedKey =
    (monthParam && monthOptions.some((m) => m.key === monthParam) ? monthParam : undefined) ??
    monthOptions.find((m) => m.status === "in_progress")?.key ??
    monthOptions[0]?.key ??
    "";

  const cyclesThisMonth = cycles.filter((c) => `${c.year}-${String(c.month).padStart(2, "0")}` === selectedKey);
  const cycleIds = cyclesThisMonth.map((c) => c.id);
  const monthLabel = monthOptions.find((m) => m.key === selectedKey)?.label ?? "No month";

  const [reviews, headcount] = await Promise.all([
    cycleIds.length
      ? prisma.review.findMany({
          where: { cycleId: { in: cycleIds } },
          include: {
            reviewee: {
              select: {
                id: true,
                name: true,
                jobTitle: true,
                avatarUrl: true,
                department: { select: { name: true } },
                team: { select: { name: true } },
              },
            },
            reviewer: { select: { name: true } },
          },
          orderBy: { submittedAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.member.count({ where: { orgId: actor.orgId } }),
  ]);

  const submitted = reviews.filter((r) => r.status === "completed");
  const outstanding = reviews.length - submitted.length;
  const peopleReviewed = new Set(submitted.map((r) => r.revieweeId)).size;
  const avgScore = submitted.length
    ? submitted.reduce((s, r) => s + Number(r.overallScore ?? 0), 0) / submitted.length
    : null;

  // Per department, so HR can see where reviewing has and has not happened.
  const byDepartment = new Map<string, { done: number; total: number; sum: number }>();
  for (const r of reviews) {
    const dept = r.reviewee.department?.name ?? "No department";
    const row = byDepartment.get(dept) ?? { done: 0, total: 0, sum: 0 };
    row.total += 1;
    if (r.status === "completed") {
      row.done += 1;
      row.sum += Number(r.overallScore ?? 0);
    }
    byDepartment.set(dept, row);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, color: "#767FA5", fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>
            Organization · Read-only
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", marginTop: 4 }}>
            Human resources
          </div>
          <div style={{ fontSize: 14, color: "#596392", marginTop: 4, maxWidth: 620, lineHeight: 1.55 }}>
            The review record for {monthLabel}, across every department. Coaching notes and the reasons people write on
            their check-ins stay between them and their manager, and are not shown here.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {monthOptions.length > 0 ? <MonthPicker months={monthOptions} selectedKey={selectedKey} /> : null}
          {cycleIds.length ? (
            <a
              href={`/api/hr/export?month=${selectedKey}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontSize: 13,
                fontWeight: 500,
                color: "#273FF9",
                background: "rgba(255,255,255,.6)",
                border: "1px solid rgba(255,255,255,.75)",
                borderRadius: 12,
                padding: "11px 16px",
                textDecoration: "none",
              }}
            >
              <iconify-icon icon="ant-design:download-outlined" width="15" />
              Export CSV
            </a>
          ) : null}
        </div>
      </div>

      {monthOptions.length === 0 ? (
        <EmptyState
          icon="ant-design:calendar-outlined"
          title="No review cycles yet"
          body="Nothing has been opened for review, so there is no record to show. Once a month opens, everything submitted in it appears here."
        />
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <StatCard icon="ant-design:team-outlined" label="Employees" value={String(headcount)} sub="on the platform" />
            <StatCard
              icon="ant-design:file-done-outlined"
              label="Reviews submitted"
              value={String(submitted.length)}
              sub={outstanding ? `${outstanding} still outstanding` : "nothing outstanding"}
            />
            <StatCard
              icon="ant-design:user-switch-outlined"
              label="People reviewed"
              value={String(peopleReviewed)}
              sub={`of ${headcount} employees`}
            />
            <StatCard
              icon="ant-design:line-chart-outlined"
              label="Average score"
              value={avgScore != null ? avgScore.toFixed(1) : "—"}
              sub={avgScore != null ? "across submitted reviews" : "nothing submitted yet"}
            />
          </div>

          <Panel title="By department" caption={`Where reviewing stands for ${monthLabel}.`}>
            {byDepartment.size === 0 ? (
              <div className="piq-caption">No reviews were raised for this month.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...byDepartment.entries()]
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([dept, row]) => (
                    <div
                      key={dept}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 1fr 130px 90px",
                        gap: 14,
                        alignItems: "center",
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: "rgba(255,255,255,.5)",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-strong)" }}>{dept}</div>
                      <Progress done={row.done} total={row.total} />
                      <div className="piq-caption" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {row.done} of {row.total} submitted
                      </div>
                      <div
                        style={{
                          textAlign: "right",
                          fontSize: 15,
                          fontWeight: 500,
                          color: "var(--text-strong)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {row.done ? (row.sum / row.done).toFixed(1) : "—"}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Panel>

          <Panel
            title={`Submitted reviews · ${monthLabel}`}
            caption={
              outstanding
                ? `${submitted.length} submitted. ${outstanding} still to come — unfinished reviews are not shown, since a draft is not a judgement yet.`
                : `${submitted.length} submitted.`
            }
          >
            {submitted.length === 0 ? (
              <div className="piq-caption">Nothing has been submitted for this month yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 820 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.6fr 1.2fr 1.2fr 1fr .8fr",
                      gap: 14,
                      padding: "0 14px 10px",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      letterSpacing: ".05em",
                      textTransform: "uppercase",
                    }}
                  >
                    <div>Employee</div>
                    <div>Department · team</div>
                    <div>Reviewed by</div>
                    <div>Submitted</div>
                    <div style={{ textAlign: "right" }}>Score</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {submitted.map((r) => (
                      <Link
                        key={r.id}
                        href={`/hr/employees/${r.reviewee.id}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.6fr 1.2fr 1.2fr 1fr .8fr",
                          gap: 14,
                          alignItems: "center",
                          padding: "12px 14px",
                          borderRadius: 14,
                          background: "rgba(255,255,255,.5)",
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <Avatar name={r.reviewee.name} src={r.reviewee.avatarUrl} size={30} round />
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 500,
                                color: "var(--text-strong)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {r.reviewee.name}
                            </div>
                            <div className="piq-caption">{r.reviewee.jobTitle ?? "—"}</div>
                          </div>
                        </div>
                        <div className="piq-caption">
                          {r.reviewee.department?.name ?? "—"}
                          {r.reviewee.team?.name ? ` · ${r.reviewee.team.name}` : ""}
                        </div>
                        <div className="piq-caption">
                          {r.type === "self" ? "Self review" : r.reviewer.name}
                        </div>
                        <div className="piq-caption">
                          {r.submittedAt
                            ? r.submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                            : "—"}
                        </div>
                        <div
                          style={{
                            textAlign: "right",
                            fontSize: 17,
                            fontWeight: 500,
                            color: "var(--text-strong)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {r.overallScore != null ? Number(r.overallScore).toFixed(1) : "—"}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
