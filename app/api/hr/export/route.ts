import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

/**
 * One month of the review record as CSV.
 *
 * Submitted reviews only, matching the page: HR downloads what HR can see,
 * not more. Coaching notes and written check-in reasons are absent here for
 * the same reason they are absent from the page — they were promised to stay
 * between a member and their manager, and a spreadsheet is the easiest place
 * for that promise to leak.
 */
function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  let actor;
  try {
    actor = await getCurrentMember();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (actor.authRole !== "hr" && actor.authRole !== "admin") {
    return NextResponse.json({ error: "This export is for HR." }, { status: 403 });
  }

  const month = new URL(request.url).searchParams.get("month") ?? "";
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return NextResponse.json({ error: "Pass a month as YYYY-MM." }, { status: 400 });
  }
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);

  const reviews = await prisma.review.findMany({
    where: {
      status: "completed",
      cycle: { orgId: actor.orgId, year, month: monthNumber },
    },
    orderBy: [{ submittedAt: "desc" }],
    include: {
      cycle: { select: { label: true } },
      reviewer: { select: { name: true } },
      reviewee: {
        select: {
          name: true,
          email: true,
          empId: true,
          jobTitle: true,
          department: { select: { name: true } },
          team: { select: { name: true } },
          manager: { select: { name: true } },
        },
      },
      kpiScores: { include: { kpi: { select: { name: true } } } },
    },
  });

  const header = [
    "Month",
    "Employee ID",
    "Employee",
    "Email",
    "Job title",
    "Department",
    "Team",
    "Manager",
    "Review type",
    "Reviewer",
    "Submitted",
    "Overall score",
    "KPI ratings",
  ];

  const lines = [header.map(csvCell).join(",")];
  for (const r of reviews) {
    lines.push(
      [
        r.cycle.label,
        r.reviewee.empId,
        r.reviewee.name,
        r.reviewee.email,
        r.reviewee.jobTitle,
        r.reviewee.department?.name ?? "",
        r.reviewee.team?.name ?? "",
        r.reviewee.manager?.name ?? "",
        r.type === "self" ? "Self" : r.type === "manager" ? "Manager" : "Peer",
        r.type === "self" ? r.reviewee.name : r.reviewer.name,
        r.submittedAt ? r.submittedAt.toISOString().slice(0, 10) : "",
        r.overallScore != null ? Number(r.overallScore).toFixed(2) : "",
        r.kpiScores.map((s) => `${s.kpi.name}: ${s.rating}/5`).join(" | "),
      ]
        .map(csvCell)
        .join(","),
    );
  }

  // The BOM is what makes Excel read this as UTF-8; without it the accented
  // names in the directory arrive mangled.
  const body = "﻿" + lines.join("\r\n") + "\r\n";

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="performiq-reviews-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
