import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";
import { Panel, StatCard } from "@/components/hr/HrPanels";

/**
 * One person's record, read-only.
 *
 * Their submitted reviews across every month, with the per-KPI ratings behind
 * each score — a 3.8 on its own tells HR nothing about what happened. What is
 * NOT here is as deliberate: no coaching notes, and no written check-in
 * reasons. Both were promised to the employee as private to their manager.
 */
export default async function HrEmployeePage({ params }: PageProps<"/hr/employees/[memberId]">) {
  const actor = await getCurrentMember();
  if (actor.authRole !== "hr" && actor.authRole !== "admin") redirect("/dashboard");

  const { memberId } = await params;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      department: { select: { name: true } },
      team: { select: { name: true } },
      manager: { select: { id: true, name: true } },
    },
  });
  if (!member || member.orgId !== actor.orgId) notFound();

  const reviews = await prisma.review.findMany({
    where: { revieweeId: member.id, status: "completed" },
    orderBy: { submittedAt: "desc" },
    include: {
      reviewer: { select: { name: true } },
      cycle: { select: { label: true, year: true, month: true } },
      kpiScores: { include: { kpi: { select: { name: true } } } },
    },
  });

  const scores = reviews.map((r) => Number(r.overallScore ?? 0)).filter((n) => n > 0);
  const average = scores.length ? scores.reduce((s, n) => s + n, 0) / scores.length : null;
  const latest = reviews[0];
  const previous = reviews[1];
  const delta =
    latest?.overallScore != null && previous?.overallScore != null
      ? Number(latest.overallScore) - Number(previous.overallScore)
      : null;

  const detail = [
    ["Employee ID", member.empId],
    ["Email", member.email],
    ["Job title", member.jobTitle],
    ["Department", member.department?.name ?? null],
    ["Team", member.team?.name ?? null],
    ["Manager", member.manager?.name ?? null],
    ["Location", member.location],
    ["Work type", member.workType],
    ["Phone", member.phone],
    [
      "Joined",
      member.joinedDate
        ? member.joinedDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : null,
    ],
    ["Account", member.authUserId ? "Activated" : "Invite not accepted"],
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <Link href="/hr/employees" className="piq-caption" style={{ textDecoration: "none" }}>
        ← Back to employees
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <Avatar name={member.name} src={member.avatarUrl} size={56} round />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-.02em", color: "#181835" }}>{member.name}</div>
          <div className="piq-caption" style={{ marginTop: 2 }}>
            {member.jobTitle ?? "—"}
            {member.department?.name ? ` · ${member.department.name}` : ""}
            {member.team?.name ? ` · ${member.team.name}` : ""}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatCard
          icon="ant-design:file-done-outlined"
          label="Reviews on record"
          value={String(reviews.length)}
          sub={reviews.length ? "submitted reviews" : "never reviewed"}
        />
        <StatCard
          icon="ant-design:line-chart-outlined"
          label="Average score"
          value={average != null ? average.toFixed(1) : "—"}
          sub={average != null ? "across all months" : "nothing to average yet"}
        />
        <StatCard
          icon="ant-design:rise-outlined"
          label="Latest"
          value={latest?.overallScore != null ? Number(latest.overallScore).toFixed(1) : "—"}
          sub={
            delta != null
              ? `${delta >= 0 ? "up" : "down"} ${Math.abs(delta).toFixed(1)} on the month before`
              : latest
                ? (latest.cycle.label ?? "most recent")
                : "no reviews yet"
          }
        />
      </div>

      <Panel title="Details" caption="From the employee record.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          {detail.map(([label, value]) => (
            <div key={label}>
              <div
                style={{ fontSize: 11, fontWeight: 500, color: "#767FA5", letterSpacing: ".05em", textTransform: "uppercase" }}
              >
                {label}
              </div>
              <div style={{ fontSize: 14, color: "var(--text-strong)", marginTop: 3, wordBreak: "break-word" }}>
                {value || "—"}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Review history"
        caption={
          reviews.length
            ? "Every submitted review, newest first, with the ratings behind each score."
            : "Nothing submitted yet."
        }
      >
        {reviews.length === 0 ? (
          <div className="piq-caption">
            This person has no submitted reviews. Unfinished ones are not shown — a draft is not a judgement yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reviews.map((r) => (
              <div key={r.id} style={{ padding: "16px 18px", borderRadius: 16, background: "rgba(255,255,255,.5)" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-strong)" }}>{r.cycle.label}</div>
                    <div className="piq-caption" style={{ marginTop: 2 }}>
                      {r.type === "self" ? "Self review" : `${r.type === "manager" ? "Manager review" : "Peer review"} · ${r.reviewer.name}`}
                      {r.submittedAt
                        ? ` · submitted ${r.submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                        : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>
                    {r.overallScore != null ? Number(r.overallScore).toFixed(1) : "—"}
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}> / 5</span>
                  </div>
                </div>

                {r.kpiScores.length ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                      gap: 8,
                      marginTop: 14,
                    }}
                  >
                    {r.kpiScores.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "8px 12px",
                          borderRadius: 11,
                          background: "rgba(255,255,255,.6)",
                        }}
                      >
                        <span style={{ fontSize: 13, color: "var(--text-body)" }}>{s.kpi.name}</span>
                        <span
                          style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}
                        >
                          {s.rating}/5
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {r.revieweeComment ? (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(168,175,203,.3)" }}>
                    <div
                      style={{ fontSize: 11, fontWeight: 500, color: "#767FA5", letterSpacing: ".05em", textTransform: "uppercase" }}
                    >
                      {member.name.split(" ")[0]}&rsquo;s reply
                    </div>
                    <div style={{ fontSize: 13.5, color: "var(--text-body)", lineHeight: 1.6, marginTop: 4, whiteSpace: "pre-wrap" }}>
                      {r.revieweeComment}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
