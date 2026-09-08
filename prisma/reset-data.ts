/**
 * Wipes all content data so the app starts from a genuine empty state —
 * no demo org chart, no seeded cycles, KPIs, reviews, courses or check-ins.
 * Everything after this comes from real use of the product.
 *
 * DELIBERATELY PRESERVED:
 *   - the Organization row (the app needs one to resolve any member's org)
 *   - every Member that has a working login (authUserId set) whose email is
 *     listed in KEEP_EMAILS — without this you'd delete your own account and
 *     lock yourself out, since sign-in resolves a Member by auth user id.
 *
 * Everything else goes: all other members, teams, departments, cycles,
 * reviews and their scores, KPIs, courses and learning progress, lesson
 * requests, mood check-ins, and the audit trail.
 *
 * Run with:  npm run db:reset-data -- --yes
 * (the flag is required; there's no undo)
 */
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

// Same convention as prisma.config.ts: real credentials live in .env.local,
// which the Prisma CLI loads but a plain `tsx` run does not.
loadEnv({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Accounts that keep their login and Member row. */
const KEEP_EMAILS = (process.env.RESET_KEEP_EMAILS ?? "admin@performiq.dev,ranafida2017@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error("Refusing to run without --yes. This permanently deletes all content data.");
    console.error("Usage: npm run db:reset-data -- --yes");
    process.exitCode = 1;
    return;
  }

  const kept = await prisma.member.findMany({
    where: { email: { in: KEEP_EMAILS, mode: "insensitive" } },
    select: { id: true, email: true, authUserId: true },
  });
  if (kept.length === 0) {
    console.error(`None of the keep-list emails exist (${KEEP_EMAILS.join(", ")}) — aborting rather than`);
    console.error("deleting every member and leaving nobody able to sign in.");
    process.exitCode = 1;
    return;
  }
  const keptIds = kept.map((m) => m.id);
  console.log("Keeping:", kept.map((m) => m.email).join(", "));

  // --- scored/derived data first (these reference cycles, kpis and members)
  await prisma.reviewKpiScore.deleteMany({});
  await prisma.memberKpiScore.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.reviewAssignment.deleteMany({});
  await prisma.reviewerGrant.deleteMany({});

  // --- KPIs and the cycles they hang off
  await prisma.kpiTeam.deleteMany({});
  await prisma.kpi.deleteMany({});
  await prisma.cycleSnapshot.deleteMany({});
  await prisma.reviewCycle.deleteMany({});

  // --- learning
  await prisma.learnerProgress.deleteMany({});
  await prisma.learningAssignment.deleteMany({});
  await prisma.quizOption.deleteMany({});
  await prisma.quizQuestion.deleteMany({});
  await prisma.courseArticle.deleteMany({});
  await prisma.course.deleteMany({});

  // --- everything else that points at a member
  await prisma.lessonRequest.deleteMany({});
  await prisma.moodCheckin.deleteMany({});
  await prisma.auditLog.deleteMany({});

  // --- break the references that would block deleting members
  await prisma.team.updateMany({ data: { leadMemberId: null } });
  await prisma.department.updateMany({ data: { headMemberId: null } });
  await prisma.member.updateMany({ data: { managerId: null } });

  const removed = await prisma.member.deleteMany({ where: { id: { notIn: keptIds } } });

  // --- org structure (the kept accounts are detached from it first)
  await prisma.member.updateMany({ where: { id: { in: keptIds } }, data: { teamId: null, departmentId: null } });
  await prisma.team.deleteMany({});
  await prisma.department.deleteMany({});

  console.log(`Removed ${removed.count} members, and every team, department, cycle, KPI, review, course,`);
  console.log("lesson request, mood check-in and audit entry. The organization row was kept.");
  console.log("\nRebuild from the UI: Settings → add a department, Teams → create a team,");
  console.log("Members → invite people, then start a review cycle and add KPIs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
