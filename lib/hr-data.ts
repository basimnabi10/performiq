import "server-only";

import { prisma } from "@/lib/prisma";
import type { HrDashboard, HrDeptStatus, HrMonth, HrPerson, HrStrip, HrTeamRow, HrWellbeing, ReviewState } from "@/lib/hr-shape";
import { FLAT_SPREAD, WELLBEING_MIN_GROUP } from "@/lib/hr-shape";

export * from "@/lib/hr-shape";

/**
 * Everything the HR dashboard reads, for one period, in one pass.
 *
 * Gathered here rather than per-tab so every panel on screen describes the
 * same month — a tab that ran its own queries could drift a period out of
 * step with the header, and the numbers would quietly disagree.
 *
 * Two things are deliberately never selected: coaching notes, and the written
 * reason on a mood check-in. Both were promised to stay between a member and
 * their manager. Leaving them out of the query (rather than out of the JSX)
 * means they cannot reach the client by accident.
 */

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function loadHrDashboard(orgId: string, requestedMonth?: string): Promise<HrDashboard> {
  const cycles = await prisma.reviewCycle.findMany({
    where: { orgId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: { id: true, label: true, year: true, month: true, status: true, endDate: true },
  });

  // One entry per period: each department runs its own cycle for the same
  // month, so September would otherwise appear once per department.
  const months: HrMonth[] = [];
  for (const c of cycles) {
    const key = monthKey(c.year, c.month);
    const existing = months.find((m) => m.key === key);
    if (!existing) {
      months.push({
        key,
        label: c.label,
        status: c.status,
        daysLeft:
          c.status === "in_progress"
            ? Math.max(0, Math.ceil((c.endDate.getTime() - Date.now()) / 86_400_000))
            : undefined,
      });
    } else if (c.status === "in_progress" && existing.status !== "in_progress") {
      existing.status = "in_progress";
      existing.daysLeft = Math.max(0, Math.ceil((c.endDate.getTime() - Date.now()) / 86_400_000));
    }
  }

  const selectedKey =
    (requestedMonth && months.some((m) => m.key === requestedMonth) ? requestedMonth : undefined) ??
    months.find((m) => m.status === "in_progress")?.key ??
    months[0]?.key ??
    "";

  const selectedIndex = months.findIndex((m) => m.key === selectedKey);
  // months are newest-first, so the next entry is the previous period.
  const previous = selectedIndex >= 0 ? months[selectedIndex + 1] : undefined;

  const current = cycles.filter((c) => monthKey(c.year, c.month) === selectedKey);
  const prior = previous ? cycles.filter((c) => monthKey(c.year, c.month) === previous.key) : [];
  const currentIds = current.map((c) => c.id);
  const priorIds = prior.map((c) => c.id);
  const endByCycle = new Map(current.map((c) => [c.id, c.endDate]));

  const [members, currentReviews, priorReviews, moods, departments, assignments] = await Promise.all([
    prisma.member.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        email: true,
        empId: true,
        jobTitle: true,
        avatarUrl: true,
        department: { select: { id: true, name: true, head: { select: { name: true } } } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    currentIds.length
      ? prisma.review.findMany({
          // A self-review is someone's account of themselves, not an
          // assessment of them, so it is not part of the record HR reads.
          where: { cycleId: { in: currentIds }, type: { not: "self" } },
          select: {
            id: true,
            revieweeId: true,
            status: true,
            overallScore: true,
            submittedAt: true,
            cycleId: true,
            reviewer: { select: { id: true, name: true } },
            kpiScores: { select: { rating: true, kpi: { select: { name: true } } } },
          },
        })
      : Promise.resolve([]),
    priorIds.length
      ? prisma.review.findMany({
          where: { cycleId: { in: priorIds }, type: { not: "self" }, status: "completed" },
          select: { revieweeId: true, overallScore: true },
        })
      : Promise.resolve([]),
    currentIds.length
      ? prisma.moodCheckin.findMany({
          // `reason` is deliberately not selected — see the note at the top.
          where: {
            member: { orgId },
            date: {
              gte: new Date(Date.UTC(Number(selectedKey.slice(0, 4)), Number(selectedKey.slice(5, 7)) - 1, 1)),
              lt: new Date(Date.UTC(Number(selectedKey.slice(0, 4)), Number(selectedKey.slice(5, 7)), 1)),
            },
          },
          select: { memberId: true, value: true },
        })
      : Promise.resolve([]),
    prisma.department.findMany({
      where: { orgId },
      select: { id: true, name: true, head: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.learningAssignment.findMany({
      where: { member: { orgId } },
      select: {
        memberId: true,
        status: true,
        progressPct: true,
        dueDate: true,
        course: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const learningByMember = new Map<string, HrPerson["learning"]>();
  for (const a of assignments) {
    const row = learningByMember.get(a.memberId) ?? [];
    row.push({
      course: a.course.title,
      status: a.status,
      progressPct: a.progressPct,
      dueDate: a.dueDate ? a.dueDate.toISOString() : null,
    });
    learningByMember.set(a.memberId, row);
  }

  const prevByMember = new Map<string, number>();
  for (const r of priorReviews) {
    if (r.overallScore != null) prevByMember.set(r.revieweeId, Number(r.overallScore));
  }

  // The assessment of record per person: a submitted review wins over an
  // unfinished one, so a manager still drafting doesn't hide a result.
  const bestByMember = new Map<string, (typeof currentReviews)[number]>();
  for (const r of currentReviews) {
    const held = bestByMember.get(r.revieweeId);
    if (!held || (r.status === "completed" && held.status !== "completed")) {
      bestByMember.set(r.revieweeId, r);
    }
  }

  const now = Date.now();
  const people: HrPerson[] = members.map((m) => {
    const r = bestByMember.get(m.id);
    const score = r?.status === "completed" && r.overallScore != null ? Number(r.overallScore) : null;
    const prevScore = prevByMember.get(m.id) ?? null;
    const dueBy = r ? endByCycle.get(r.cycleId) : undefined;

    const state: ReviewState = !r
      ? "unassigned"
      : r.status === "completed"
        ? "submitted"
        : dueBy && dueBy.getTime() < now
          ? "overdue"
          : "in_progress";

    return {
      memberId: m.id,
      name: m.name,
      email: m.email,
      empId: m.empId,
      jobTitle: m.jobTitle,
      avatarUrl: m.avatarUrl,
      department: m.department?.name ?? "No department",
      team: m.team?.name ?? "No team",
      hod: m.department?.head?.name ?? null,
      reviewerName: r?.reviewer.name ?? null,
      reviewId: r?.id ?? null,
      state,
      submittedAt: r?.submittedAt ? r.submittedAt.toISOString() : null,
      score,
      prevScore,
      delta: score != null && prevScore != null ? Math.round((score - prevScore) * 100) / 100 : null,
      kpis: r?.status === "completed" ? r.kpiScores.map((k) => ({ name: k.kpi.name, rating: k.rating })) : [],
      learning: learningByMember.get(m.id) ?? [],
    };
  });

  // ---- department status ----
  const deptStatus: HrDeptStatus[] = departments.map((d) => {
    const rows = people.filter((p) => p.department === d.name);
    return {
      name: d.name,
      hod: d.head?.name ?? null,
      submitted: rows.filter((p) => p.state === "submitted").length,
      inProgress: rows.filter((p) => p.state === "in_progress").length,
      overdue: rows.filter((p) => p.state === "overdue").length,
      unassigned: rows.filter((p) => p.state === "unassigned").length,
      total: rows.length,
    };
  });
  const noDept = people.filter((p) => p.department === "No department");
  if (noDept.length) {
    deptStatus.push({
      name: "No department",
      hod: null,
      submitted: noDept.filter((p) => p.state === "submitted").length,
      inProgress: noDept.filter((p) => p.state === "in_progress").length,
      overdue: noDept.filter((p) => p.state === "overdue").length,
      unassigned: noDept.filter((p) => p.state === "unassigned").length,
      total: noDept.length,
    });
  }

  // ---- teams ----
  const teams = await prisma.team.findMany({
    where: { orgId },
    select: {
      id: true,
      name: true,
      department: { select: { name: true, head: { select: { name: true } } } },
      members: { select: { id: true } },
    },
    orderBy: { name: "asc" },
  });
  const teamRows: HrTeamRow[] = teams.map((t) => {
    const ids = new Set(t.members.map((m) => m.id));
    const rows = people.filter((p) => ids.has(p.memberId));
    const scored = rows.filter((p) => p.score != null).map((p) => p.score!);
    // Compare the same people only: an average that swaps its population
    // between periods measures who was reviewed, not how anyone did.
    const bothPeriods = rows.filter((p) => p.score != null && p.prevScore != null);
    const avg = scored.length ? scored.reduce((s, v) => s + v, 0) / scored.length : null;
    const prevAvg = bothPeriods.length
      ? bothPeriods.reduce((s, p) => s + p.prevScore!, 0) / bothPeriods.length
      : null;
    const nowAvgSame = bothPeriods.length
      ? bothPeriods.reduce((s, p) => s + p.score!, 0) / bothPeriods.length
      : null;
    return {
      teamId: t.id,
      name: t.name,
      department: t.department?.name ?? "No department",
      hod: t.department?.head?.name ?? null,
      headcount: rows.length,
      avg,
      prevAvg,
      delta: nowAvgSame != null && prevAvg != null ? Math.round((nowAvgSame - prevAvg) * 100) / 100 : null,
      done: rows.filter((p) => p.state === "submitted").length,
      total: rows.length,
    };
  });

  // ---- wellbeing, aggregated and suppressed for small groups ----
  const memberDept = new Map(members.map((m) => [m.id, m.department?.name ?? "No department"]));
  const moodByDept = new Map<string, { values: number[]; people: Set<string> }>();
  for (const c of moods) {
    const d = memberDept.get(c.memberId) ?? "No department";
    const row = moodByDept.get(d) ?? { values: [], people: new Set<string>() };
    row.values.push(c.value);
    row.people.add(c.memberId);
    moodByDept.set(d, row);
  }
  const wellbeing: HrWellbeing[] = deptStatus.map((d) => {
    const row = moodByDept.get(d.name);
    const values = row?.values ?? [];
    const suppressed = values.length > 0 && values.length < WELLBEING_MIN_GROUP;
    return {
      name: d.name,
      avg: values.length && !suppressed ? values.reduce((s, v) => s + v, 0) / values.length : null,
      counts: [1, 2, 3, 4, 5].map((v) => (suppressed ? 0 : values.filter((x) => x === v).length)),
      checkIns: values.length,
      people: row?.people.size ?? 0,
      suppressed,
    };
  });

  // ---- calibration ----
  const submittedPeople = people.filter((p) => p.score != null);
  const histogram = [
    { label: "< 2.5", min: 0, max: 2.5 },
    { label: "2.5–3.0", min: 2.5, max: 3 },
    { label: "3.0–3.5", min: 3, max: 3.5 },
    { label: "3.5–4.0", min: 3.5, max: 4 },
    { label: "4.0–4.5", min: 4, max: 4.5 },
    { label: "4.5–5.0", min: 4.5, max: 5.01 },
  ].map((b) => ({
    label: b.label,
    count: submittedPeople.filter((p) => p.score! >= b.min && p.score! < b.max).length,
  }));

  function strip(label: string, sub: string, scores: number[]): HrStrip {
    const mean = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null;
    const min = scores.length ? Math.min(...scores) : null;
    const max = scores.length ? Math.max(...scores) : null;
    return {
      label,
      sub,
      scores,
      mean,
      min,
      max,
      // Flat marking is only meaningful with enough reviews to have a spread.
      flat: scores.length >= 3 && max != null && min != null && max - min < FLAT_SPREAD,
    };
  }

  const deptStrips = deptStatus
    .map((d) => {
      const scores = submittedPeople.filter((p) => p.department === d.name).map((p) => p.score!);
      return strip(d.name, d.hod ? `HOD ${d.hod}` : "No HOD set", scores);
    })
    .filter((s) => s.scores.length > 0);

  const byReviewer = new Map<string, { name: string; scores: number[] }>();
  for (const r of currentReviews) {
    if (r.status !== "completed" || r.overallScore == null) continue;
    const row = byReviewer.get(r.reviewer.id) ?? { name: r.reviewer.name, scores: [] };
    row.scores.push(Number(r.overallScore));
    byReviewer.set(r.reviewer.id, row);
  }
  const reviewerStrips = [...byReviewer.values()]
    .map((r) => strip(r.name, `${r.scores.length} submitted`, r.scores))
    .sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));

  return {
    months,
    selectedKey,
    selectedLabel: months.find((m) => m.key === selectedKey)?.label ?? "No month",
    selectedDaysLeft: months.find((m) => m.key === selectedKey)?.daysLeft,
    previousLabel: previous?.label ?? null,
    people,
    deptStatus,
    teamRows,
    wellbeing,
    histogram,
    deptStrips,
    reviewerStrips,
    headcount: members.length,
  };
}
