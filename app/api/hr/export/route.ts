import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authz";
import { STATUS_LABELS, loadHrDashboard } from "@/lib/hr-data";

/**
 * One month of the review record as CSV.
 *
 * Built from the same `loadHrDashboard` pass the page renders, so the file
 * and the screen can never disagree — an export computed separately drifts
 * the first time either side changes, and the spreadsheet is the copy people
 * forward. Everyone is listed, not only the reviewed: the rows with no score
 * are the ones worth chasing.
 *
 * Coaching notes and written check-in reasons are absent here for the same
 * reason they are absent from the page — they were promised to stay between
 * a member and their manager, and a spreadsheet is the easiest place for
 * that promise to leak.
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
  if (!/^(\d{4})-(\d{2})$/.test(month)) {
    return NextResponse.json({ error: "Pass a month as YYYY-MM." }, { status: 400 });
  }

  const data = await loadHrDashboard(actor.orgId, month);

  const header = [
    "Month",
    "Employee ID",
    "Employee",
    "Email",
    "Job title",
    "Department",
    "Team",
    "Reviewer",
    "Review status",
    "Overall score",
    data.previousLabel ? `${data.previousLabel} score` : "Previous score",
    "Change",
    "Submitted",
    "KPI ratings",
  ];

  const lines = [header.map(csvCell).join(",")];
  for (const p of data.people) {
    lines.push(
      [
        data.selectedLabel,
        p.empId,
        p.name,
        p.email,
        p.jobTitle,
        p.department,
        p.team,
        p.reviewerName ?? "",
        STATUS_LABELS[p.state],
        p.score != null ? p.score.toFixed(2) : "",
        p.prevScore != null ? p.prevScore.toFixed(2) : "",
        p.delta != null ? p.delta.toFixed(2) : "",
        p.submittedAt ? p.submittedAt.slice(0, 10) : "",
        p.kpis.map((k) => `${k.name}: ${k.rating}/5`).join(" | "),
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
