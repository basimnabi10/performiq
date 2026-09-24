import { NextResponse, type NextRequest } from "next/server";
import { AuthzError, getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { cycleScopeWhere } from "@/lib/cycles";

/**
 * Per-month performance export.
 *
 * Goes through getCurrentMember and the same cycle/team scoping the pages
 * use, so an HOD exporting gets their department and nothing else — an
 * export route is exactly where a missing scope check quietly leaks the
 * whole organization's review data.
 */

/**
 * Deliberately absent from this file: CoachingNote.
 *
 * This export is the report shared with HR, and the whole reason notes are a
 * separate thing from reviews is that they do not go in it. If a future
 * column needs "everything we know about this person", it still does not
 * include notes -- add a separate, explicitly-labelled export instead.
 */

/** RFC 4180: quote anything containing a comma, quote or newline. */
function csvCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

export async function GET(request: NextRequest) {
  let actor;
  try {
    actor = await getCurrentMember();
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    throw e;
  }

  if (actor.authRole !== "admin" && actor.authRole !== "hod" && actor.authRole !== "manager") {
    return NextResponse.json({ error: "You don't have access to export reports." }, { status: 403 });
  }

  const monthParam = request.nextUrl.searchParams.get("month");
  const teamParam = request.nextUrl.searchParams.get("team");

  const scopeWhere = cycleScopeWhere(actor);
  const cycles = await prisma.reviewCycle.findMany({
    where: scopeWhere,
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  if (cycles.length === 0) {
    return NextResponse.json({ error: "There are no review months to export yet." }, { status: 404 });
  }

  const keyOf = (c: { year: number; month: number }) => `${c.year}-${String(c.month).padStart(2, "0")}`;
  const selectedKey = monthParam && cycles.some((c) => keyOf(c) === monthParam)
    ? monthParam
    : keyOf(cycles.find((c) => c.status === "in_progress") ?? cycles[0]);

  // Every cycle for that period, so an admin exports the whole organization
  // rather than whichever department happened to sort first.
  const monthCycles = cycles.filter((c) => keyOf(c) === selectedKey);
  const monthCycleIds = monthCycles.map((c) => c.id);
  const monthLabel = monthCycles[0]?.label ?? selectedKey;

  const teams = await prisma.team.findMany({
    where: actor.authRole === "admin" ? { orgId: actor.orgId } : { departmentId: actor.departmentId ?? "" },
    select: { id: true, name: true },
  });
  const scopeTeamIds = teamParam && teams.some((t) => t.id === teamParam)
    ? [teamParam]
    : teams.map((t) => t.id);

  const members = await prisma.member.findMany({
    where: { teamId: { in: scopeTeamIds } },
    select: { id: true, name: true, email: true, jobTitle: true, authRole: true, team: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  const memberIds = members.map((m) => m.id);

  const [scores, reviews] = await Promise.all([
    prisma.memberKpiScore.findMany({
      where: { cycleId: { in: monthCycleIds }, memberId: { in: memberIds } },
      select: { memberId: true, score: true, kpi: { select: { name: true } } },
    }),
    prisma.review.findMany({
      where: { cycleId: { in: monthCycleIds }, revieweeId: { in: memberIds } },
      select: { revieweeId: true, status: true, type: true, overallScore: true },
    }),
  ]);

  // One column per KPI actually scored this month, so the sheet has no dead
  // columns for KPIs nobody was rated on.
  const kpiNames = [...new Set(scores.map((s) => s.kpi.name))].sort();

  const header = [
    "Member", "Email", "Job title", "Role", "Team",
    ...kpiNames,
    "Average KPI score", "Reviews completed", "Reviews total", "Manager review score",
  ];

  const rows = members.map((m) => {
    const mine = scores.filter((s) => s.memberId === m.id);
    const byKpi = new Map(mine.map((s) => [s.kpi.name, Number(s.score)]));
    const avg = mine.length ? mine.reduce((sum, s) => sum + Number(s.score), 0) / mine.length : null;
    const myReviews = reviews.filter((r) => r.revieweeId === m.id);
    const managerReview = myReviews.find((r) => r.type === "manager" && r.status === "completed");
    return csvRow([
      m.name,
      m.email,
      m.jobTitle ?? "",
      m.authRole,
      m.team?.name ?? "",
      ...kpiNames.map((k) => byKpi.get(k)?.toFixed(2) ?? ""),
      avg?.toFixed(2) ?? "",
      myReviews.filter((r) => r.status === "completed").length,
      myReviews.length,
      managerReview?.overallScore != null ? Number(managerReview.overallScore).toFixed(2) : "",
    ]);
  });

  // Excel reads a bare UTF-8 CSV as the system codepage and mangles accented
  // names; the BOM is what makes "Léa Bernard" open correctly.
  const csv = "﻿" + [csvRow(header), ...rows].join("\r\n") + "\r\n";
  const filename = `performiq-${selectedKey}${teamParam ? "-team" : ""}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Report-Month": monthLabel,
    },
  });
}
