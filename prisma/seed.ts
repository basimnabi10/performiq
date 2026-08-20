/**
 * Seed script — one org, two departments/teams, members across every auth
 * role, an in-progress review cycle with weighted KPIs, a few completed
 * reviews (producing real MemberKpiScore rows via lib/scoring.ts's policy),
 * a published course with an article + quiz, an assignment, a few days of
 * mood check-ins, and a pending lesson request — so every page in the app
 * renders non-trivial data on first load.
 *
 * Run with `npm run db:seed` after `npm run db:migrate` against a real
 * Supabase Postgres connection (the placeholder .env.local values won't
 * connect). If SUPABASE_SERVICE_ROLE_KEY is a real key, this also creates a
 * matching Supabase auth user for the admin account so you can log in with
 * admin@performiq.dev / <ADMIN_SEED_PASSWORD env var, default "Passw0rd!">.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "seed-org" },
    update: {},
    create: { id: "seed-org", name: "Acme Inc" },
  });

  const productDept = await prisma.department.upsert({
    where: { id: "seed-dept-product" },
    update: {},
    create: { id: "seed-dept-product", orgId: org.id, name: "Product" },
  });

  const designTeam = await prisma.team.upsert({
    where: { id: "seed-team-design" },
    update: {},
    create: { id: "seed-team-design", orgId: org.id, departmentId: productDept.id, name: "Product Design" },
  });

  const pmTeam = await prisma.team.upsert({
    where: { id: "seed-team-pm" },
    update: {},
    create: { id: "seed-team-pm", orgId: org.id, departmentId: productDept.id, name: "Product Management" },
  });

  const admin = await prisma.member.upsert({
    where: { email: "admin@performiq.dev" },
    update: {},
    create: {
      orgId: org.id,
      name: "Andrew Kim",
      email: "admin@performiq.dev",
      authRole: "admin",
      status: "active",
      jobTitle: "Platform Admin",
    },
  });

  const hod = await prisma.member.upsert({
    where: { email: "elena.duarte@performiq.dev" },
    update: {},
    create: {
      orgId: org.id,
      name: "Elena Duarte",
      email: "elena.duarte@performiq.dev",
      authRole: "hod",
      status: "invited",
      jobTitle: "Head of Product",
      departmentId: productDept.id,
    },
  });
  await prisma.department.update({ where: { id: productDept.id }, data: { headMemberId: hod.id } });

  const manager = await prisma.member.upsert({
    where: { email: "lea.bernard@performiq.dev" },
    update: {},
    create: {
      orgId: org.id,
      name: "Léa Bernard",
      email: "lea.bernard@performiq.dev",
      authRole: "manager",
      status: "invited",
      jobTitle: "Design Lead",
      teamId: designTeam.id,
      departmentId: productDept.id,
    },
  });
  await prisma.team.update({ where: { id: designTeam.id }, data: { leadMemberId: manager.id } });

  const noah = await prisma.member.upsert({
    where: { email: "noah.kim@performiq.dev" },
    update: {},
    create: {
      orgId: org.id,
      name: "Noah Kim",
      email: "noah.kim@performiq.dev",
      authRole: "ic",
      status: "invited",
      jobTitle: "Senior Product Designer",
      teamId: designTeam.id,
      departmentId: productDept.id,
      managerId: manager.id,
    },
  });

  const emma = await prisma.member.upsert({
    where: { email: "emma.rossi@performiq.dev" },
    update: {},
    create: {
      orgId: org.id,
      name: "Emma Rossi",
      email: "emma.rossi@performiq.dev",
      authRole: "ic",
      status: "invited",
      jobTitle: "Product Designer",
      teamId: designTeam.id,
      departmentId: productDept.id,
      managerId: manager.id,
    },
  });

  await prisma.member.upsert({
    where: { email: "tomas.silva@performiq.dev" },
    update: {},
    create: {
      orgId: org.id,
      name: "Tomás Silva",
      email: "tomas.silva@performiq.dev",
      authRole: "ic",
      status: "invited",
      jobTitle: "Product Manager",
      teamId: pmTeam.id,
      departmentId: productDept.id,
    },
  });

  // --- Review cycle + KPIs -------------------------------------------------
  const cycle = await prisma.reviewCycle.upsert({
    where: { id: "seed-cycle-q4-2026" },
    update: { status: "in_progress" },
    create: {
      id: "seed-cycle-q4-2026",
      orgId: org.id,
      label: "Q4 2026",
      departmentId: productDept.id,
      status: "in_progress",
      startDate: daysAgo(20),
      endDate: daysAgo(-70),
    },
  });

  const kpiDefs = [
    { id: "seed-kpi-quality", name: "Design quality", targetNumeric: 4.5, weight: 30 },
    { id: "seed-kpi-turnaround", name: "Review turnaround", targetNumeric: 4.0, weight: 30 },
    { id: "seed-kpi-adoption", name: "Design system adoption", targetNumeric: 4.0, weight: 40 },
  ];

  for (const def of kpiDefs) {
    const kpi = await prisma.kpi.upsert({
      where: { id: def.id },
      update: {},
      create: {
        id: def.id,
        orgId: org.id,
        cycleId: cycle.id,
        ownerId: hod.id,
        name: def.name,
        metricType: "rating",
        direction: "higher_is_better",
        targetValue: `≥ ${def.targetNumeric}`,
        targetNumeric: def.targetNumeric,
        cadence: "quarterly",
        status: "on",
      },
    });
    await prisma.kpiTeam.upsert({
      where: { kpiId_teamId: { kpiId: kpi.id, teamId: designTeam.id } },
      update: {},
      create: { kpiId: kpi.id, teamId: designTeam.id, weightPct: def.weight },
    });
  }

  // --- Completed manager reviews for Noah + Emma, producing real MemberKpiScore rows
  for (const [reviewee, ratings] of [
    [noah, [5, 4, 4]],
    [emma, [4, 3, 4]],
  ] as const) {
    const review = await prisma.review.upsert({
      where: {
        cycleId_revieweeId_reviewerId_type: {
          cycleId: cycle.id,
          revieweeId: reviewee.id,
          reviewerId: manager.id,
          type: "manager",
        },
      },
      update: {},
      create: {
        cycleId: cycle.id,
        revieweeId: reviewee.id,
        reviewerId: manager.id,
        type: "manager",
        status: "pending",
      },
    });

    for (let i = 0; i < kpiDefs.length; i++) {
      await prisma.reviewKpiScore.upsert({
        where: { reviewId_kpiId: { reviewId: review.id, kpiId: kpiDefs[i].id } },
        update: { rating: ratings[i] },
        create: { reviewId: review.id, kpiId: kpiDefs[i].id, rating: ratings[i] },
      });
    }

    // Mirrors actions/reviews.ts's submitReview: mark completed, compute the
    // weighted overall score, and roll it into MemberKpiScore.
    const weightedSum = ratings.reduce((s, r, i) => s + r * kpiDefs[i].weight, 0);
    const weightTotal = kpiDefs.reduce((s, k) => s + k.weight, 0);
    await prisma.review.update({
      where: { id: review.id },
      data: { status: "completed", submittedAt: new Date(), overallScore: weightedSum / weightTotal },
    });
    for (let i = 0; i < kpiDefs.length; i++) {
      await prisma.memberKpiScore.upsert({
        where: { memberId_kpiId_cycleId: { memberId: reviewee.id, kpiId: kpiDefs[i].id, cycleId: cycle.id } },
        update: { score: ratings[i] },
        create: { memberId: reviewee.id, kpiId: kpiDefs[i].id, cycleId: cycle.id, score: ratings[i] },
      });
    }
  }

  // --- A self-review shell still pending, for the "reviews to give" widget
  await prisma.review.upsert({
    where: {
      cycleId_revieweeId_reviewerId_type: {
        cycleId: cycle.id,
        revieweeId: noah.id,
        reviewerId: noah.id,
        type: "self",
      },
    },
    update: {},
    create: { cycleId: cycle.id, revieweeId: noah.id, reviewerId: noah.id, type: "self", status: "pending" },
  });

  // --- Learning: one published course with an article + quiz -------------
  const course = await prisma.course.upsert({
    where: { id: "seed-course-feedback" },
    update: {},
    create: {
      id: "seed-course-feedback",
      orgId: org.id,
      ownerId: hod.id,
      title: "Giving effective design feedback",
      category: "Communication",
      level: "core",
      duration: "45m",
      summary: "A short course on giving actionable, kind design feedback.",
      status: "published",
    },
  });

  await prisma.courseArticle.upsert({
    where: { courseId: course.id },
    update: {},
    create: {
      courseId: course.id,
      title: "The feedback sandwich isn't enough",
      subtitle: "A more useful framework for design critique",
      bodyMarkdown:
        "## Why feedback fails\n\nMost design feedback is either too vague (\"I like it\") or too directive (\"move that button\").\n\n## A better framework\n\n1. **Observe** — describe what you see, without judgment.\n2. **Impact** — explain the effect on the user or goal.\n3. **Ask** — invite the designer's reasoning before suggesting a fix.\n",
    },
  });

  const existingQuestions = await prisma.quizQuestion.findMany({ where: { courseId: course.id } });
  if (existingQuestions.length === 0) {
    await prisma.quizQuestion.create({
      data: {
        courseId: course.id,
        order: 0,
        text: "What's the first step in the feedback framework?",
        options: {
          create: [
            { text: "Observe", isCorrect: true, order: 0 },
            { text: "Ask", isCorrect: false, order: 1 },
            { text: "Impact", isCorrect: false, order: 2 },
          ],
        },
      },
    });
  }

  await prisma.learningAssignment.upsert({
    where: { memberId_courseId: { memberId: noah.id, courseId: course.id } },
    update: {},
    create: { memberId: noah.id, courseId: course.id, assignedById: hod.id, status: "not_started" },
  });

  // --- Mood check-ins for the last 5 days ---------------------------------
  for (let i = 0; i < 5; i++) {
    await prisma.moodCheckin.upsert({
      where: { memberId_date: { memberId: noah.id, date: daysAgo(i) } },
      update: {},
      create: { memberId: noah.id, date: daysAgo(i), value: [4, 5, 3, 4, 4][i] },
    });
  }

  // --- A pending lesson request --------------------------------------------
  await prisma.lessonRequest.upsert({
    where: { id: "seed-lesson-request-1" },
    update: {},
    create: {
      id: "seed-lesson-request-1",
      memberId: emma.id,
      topic: "Prototyping in code, not just Figma",
      why: "I've been picking this up and want to share what I've learned.",
      status: "pending",
    },
  });

  console.log("Seeded org, departments, teams, members, a cycle with KPIs and completed reviews,");
  console.log("a course, learning assignment, mood check-ins, and a pending lesson request.");

  await maybeCreateAdminAuthUser(admin.email);
}

async function maybeCreateAdminAuthUser(email: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || url.includes("placeholder")) {
    console.log("Skipping Supabase auth user creation (placeholder credentials).");
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const password = process.env.ADMIN_SEED_PASSWORD ?? "Passw0rd!";

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error && !error.message.includes("already been registered")) {
    console.error("Failed to create Supabase auth user:", error.message);
    return;
  }
  console.log(`Supabase auth user ready for ${email} (password: ${password}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
