/**
 * Seed script — realistic org data modeled on the PerformIQ design reference
 * (the same names/roles/locations used across the Members, Teams, and Learning
 * mockups), not a minimal demo shell: 1 org, 1 department, 2 teams, 21 members
 * (16 active + 5 pending Odoo imports), 3 review cycles (2 closed, 1 in
 * progress) with real per-cycle KPI weight budgets, completed manager/peer/self
 * reviews producing genuine MemberKpiScore history across cycles (so Analytics
 * trend lines have real data instead of "not enough closed cycles"), 5
 * published courses with articles + quizzes and varied assignment progress,
 * three weeks of mood check-ins, lesson requests in every status, and an
 * audit trail of realistic activity.
 *
 * Run with `npm run db:seed` after `npm run db:migrate` against a real
 * Supabase Postgres connection (the placeholder .env.local values won't
 * connect). If SUPABASE_SERVICE_ROLE_KEY is a real key, this also creates a
 * matching Supabase auth user for the admin account so you can log in with
 * admin@performiq.dev / <ADMIN_SEED_PASSWORD env var, default "Passw0rd!">.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type AuthRole, type MemberStatus, type MemberSource, type Prisma } from "../lib/generated/prisma/client";

// Direct (non-pooled) connection — this script is a long-lived local process
// making hundreds of sequential round trips, which the pooled/pgbouncer
// DATABASE_URL (tuned for short-lived serverless requests) can drop mid-run.
// `prisma` is reassigned (not just mutated) on each retry in runWithRetries,
// since a client whose connection died mid-transaction can be left in a
// state where every subsequent query on it also fails — a fresh client
// avoids cascading failures from a previous attempt's broken connection.
function newPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}
let prisma = newPrismaClient();

// Small seeded PRNG (mulberry32) so re-running the seed produces the same
// "realistic" spread of ratings/moods instead of a different one every time.
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(42);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
function clampRating(n: number): number {
  return Math.max(1, Math.min(5, Math.round(n)));
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
function dateOf(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m - 1, day));
}

// ---------------------------------------------------------------------------
// Member roster — lifted from the design reference's member/Odoo directory
// data so names, roles, and locations read as a real org, not "Member 1..N".
// ---------------------------------------------------------------------------

type SeedMember = {
  key: string;
  name: string;
  email: string;
  jobTitle: string;
  authRole: AuthRole;
  team: "design" | "pm" | null;
  status: MemberStatus;
  source: MemberSource;
  targetScore: number; // used to bias generated review ratings realistically
  location?: string;
  phone?: string;
  empId?: string;
  joinedDate?: Date;
  workType?: string;
};

const ACTIVE_MEMBERS: SeedMember[] = [
  { key: "admin", name: "Andrew Kim", email: "admin@performiq.dev", jobTitle: "Platform Admin", authRole: "admin", team: null, status: "active", source: "manual", targetScore: 4.5, joinedDate: dateOf(2024, 1, 8), workType: "Full-time" },
  { key: "hod", name: "Elena Duarte", email: "elena.duarte@performiq.dev", jobTitle: "Head of Product", authRole: "hod", team: null, status: "active", source: "manual", targetScore: 4.6, location: "Lisbon, PT", joinedDate: dateOf(2024, 2, 12), workType: "Full-time" },
  { key: "lea", name: "Léa Bernard", email: "lea.bernard@performiq.dev", jobTitle: "Design Lead", authRole: "manager", team: "design", status: "active", source: "manual", targetScore: 4.8, location: "Paris, FR", joinedDate: dateOf(2024, 3, 4), workType: "Full-time" },
  { key: "noah", name: "Noah Kim", email: "noah.kim@performiq.dev", jobTitle: "Senior Product Designer", authRole: "ic", team: "design", status: "active", source: "manual", targetScore: 4.6, location: "Seoul, KR", joinedDate: dateOf(2024, 4, 15), workType: "Full-time" },
  { key: "emma", name: "Emma Rossi", email: "emma.rossi@performiq.dev", jobTitle: "Product Designer", authRole: "ic", team: "design", status: "active", source: "manual", targetScore: 3.6, location: "Milan, IT", joinedDate: dateOf(2024, 6, 2), workType: "Full-time" },
  { key: "aria", name: "Aria Haddad", email: "aria.haddad@performiq.dev", jobTitle: "Product Designer", authRole: "ic", team: "design", status: "active", source: "manual", targetScore: 4.2, location: "Dubai, AE", joinedDate: dateOf(2024, 7, 22), workType: "Full-time" },
  { key: "marco", name: "Marco Bianchi", email: "marco.bianchi@performiq.dev", jobTitle: "UX Researcher", authRole: "ic", team: "design", status: "active", source: "manual", targetScore: 4.1, location: "Rome, IT", joinedDate: dateOf(2024, 8, 11), workType: "Full-time" },
  { key: "sofia", name: "Sofia Nguyen", email: "sofia.nguyen@performiq.dev", jobTitle: "Product Designer", authRole: "ic", team: "design", status: "active", source: "manual", targetScore: 4.4, location: "Ho Chi Minh City, VN", joinedDate: dateOf(2024, 9, 9), workType: "Full-time" },
  { key: "daniel", name: "Daniel Okafor", email: "daniel.okafor@performiq.dev", jobTitle: "Visual Designer", authRole: "ic", team: "design", status: "active", source: "manual", targetScore: 4.3, location: "Lagos, NG", joinedDate: dateOf(2024, 10, 1), workType: "Full-time" },
  { key: "yuki", name: "Yuki Tanaka", email: "yuki.tanaka@performiq.dev", jobTitle: "Design Systems Engineer", authRole: "ic", team: "design", status: "active", source: "manual", targetScore: 4.5, location: "Tokyo, JP", joinedDate: dateOf(2024, 11, 18), workType: "Full-time" },
  { key: "priya", name: "Priya Raman", email: "priya.raman@performiq.dev", jobTitle: "Group PM", authRole: "manager", team: "pm", status: "active", source: "manual", targetScore: 4.6, location: "Bengaluru, IN", joinedDate: dateOf(2024, 3, 4), workType: "Full-time" },
  { key: "tomas", name: "Tomás Silva", email: "tomas.silva@performiq.dev", jobTitle: "Product Manager", authRole: "ic", team: "pm", status: "active", source: "manual", targetScore: 3.4, location: "Porto, PT", joinedDate: dateOf(2024, 5, 20), workType: "Full-time" },
  { key: "diego", name: "Diego Ortiz", email: "diego.ortiz@performiq.dev", jobTitle: "Product Manager", authRole: "ic", team: "pm", status: "active", source: "manual", targetScore: 3.7, location: "Mexico City, MX", joinedDate: dateOf(2024, 6, 30), workType: "Full-time" },
  { key: "hannah", name: "Hannah Weber", email: "hannah.weber@performiq.dev", jobTitle: "Associate PM", authRole: "ic", team: "pm", status: "active", source: "manual", targetScore: 4.0, location: "Munich, DE", joinedDate: dateOf(2024, 8, 4), workType: "Full-time" },
  { key: "omar", name: "Omar Farouk", email: "omar.farouk@performiq.dev", jobTitle: "Product Manager", authRole: "ic", team: "pm", status: "active", source: "manual", targetScore: 4.2, location: "Cairo, EG", joinedDate: dateOf(2024, 9, 15), workType: "Full-time" },
  { key: "isabel", name: "Isabel Costa", email: "isabel.costa@performiq.dev", jobTitle: "Product Operations", authRole: "ic", team: "pm", status: "active", source: "manual", targetScore: 4.1, location: "São Paulo, BR", joinedDate: dateOf(2024, 10, 27), workType: "Full-time" },
];

// Pending Odoo-sourced imports — invited but not yet activated, exercising
// the real Odoo-import fields (empId/location/phone/joinedDate/workType).
const ODOO_MEMBERS: SeedMember[] = [
  { key: "jordan", name: "Jordan Alvarez", email: "jordan.alvarez@acme.com", jobTitle: "Senior Product Designer", authRole: "ic", team: "design", status: "invited", source: "odoo", targetScore: 4.3, empId: "ACM-2041", location: "Lisbon, PT", phone: "+351 912 004 118", joinedDate: dateOf(2025, 1, 6), workType: "Full-time" },
  { key: "mei", name: "Mei Lin", email: "mei.lin@acme.com", jobTitle: "Product Designer", authRole: "ic", team: "design", status: "invited", source: "odoo", targetScore: 4.0, empId: "ACM-2088", location: "Amsterdam, NL", phone: "+31 6 4820 1193", joinedDate: dateOf(2025, 9, 1), workType: "Full-time" },
  { key: "raphael", name: "Raphaël Dubois", email: "raphael.dubois@acme.com", jobTitle: "UX Researcher", authRole: "ic", team: "design", status: "invited", source: "odoo", targetScore: 4.0, empId: "ACM-2102", location: "Paris, FR", phone: "+33 6 12 44 90 21", joinedDate: dateOf(2025, 3, 3), workType: "Full-time" },
  { key: "sara", name: "Sara Ahmadi", email: "sara.ahmadi@acme.com", jobTitle: "Product Manager", authRole: "ic", team: "pm", status: "invited", source: "odoo", targetScore: 4.0, empId: "ACM-2115", location: "Berlin, DE", phone: "+49 151 2290 4471", joinedDate: dateOf(2025, 2, 17), workType: "Full-time" },
  { key: "kwame", name: "Kwame Mensah", email: "kwame.mensah@acme.com", jobTitle: "Associate Product Manager", authRole: "ic", team: "pm", status: "invited", source: "odoo", targetScore: 3.8, empId: "ACM-2130", location: "London, UK", phone: "+44 7700 900 812", joinedDate: dateOf(2025, 10, 20), workType: "Full-time" },
];

const ALL_MEMBERS = [...ACTIVE_MEMBERS, ...ODOO_MEMBERS];

type KpiDef = { key: string; name: string; metricType: "rating" | "percentage" | "days"; direction: "higher_is_better" | "lower_is_better"; targetValue: string; targetNumeric: number; unit?: string; weight: number };

const DESIGN_KPIS: KpiDef[] = [
  { key: "quality", name: "Design quality", metricType: "rating", direction: "higher_is_better", targetValue: "≥ 4.5", targetNumeric: 4.5, unit: "rating", weight: 20 },
  { key: "turnaround", name: "Design review turnaround", metricType: "days", direction: "lower_is_better", targetValue: "≤ 2.0", targetNumeric: 2.0, unit: "days", weight: 15 },
  { key: "handoff", name: "Eng handoff acceptance", metricType: "percentage", direction: "higher_is_better", targetValue: "≥ 90%", targetNumeric: 90, unit: "percentage", weight: 20 },
  { key: "usability", name: "Usability task success", metricType: "percentage", direction: "higher_is_better", targetValue: "≥ 85%", targetNumeric: 85, unit: "percentage", weight: 15 },
  { key: "adoption", name: "Design system adoption", metricType: "percentage", direction: "higher_is_better", targetValue: "≥ 95%", targetNumeric: 95, unit: "percentage", weight: 15 },
  { key: "delivery", name: "On-time delivery", metricType: "percentage", direction: "higher_is_better", targetValue: "≥ 90%", targetNumeric: 90, unit: "percentage", weight: 15 },
];

const PM_KPIS: KpiDef[] = [
  { key: "roadmap", name: "Roadmap delivery", metricType: "percentage", direction: "higher_is_better", targetValue: "≥ 90%", targetNumeric: 90, unit: "percentage", weight: 40 },
  { key: "stakeholder", name: "Stakeholder satisfaction", metricType: "rating", direction: "higher_is_better", targetValue: "≥ 4.5", targetNumeric: 4.5, unit: "rating", weight: 30 },
  { key: "clarity", name: "Requirement clarity", metricType: "percentage", direction: "higher_is_better", targetValue: "≥ 85%", targetNumeric: 85, unit: "percentage", weight: 30 },
];

const CYCLES = [
  { key: "q1-2026", label: "Q1 2026", start: dateOf(2026, 1, 1), end: dateOf(2026, 3, 31), status: "closed" as const, completion: 1 },
  { key: "q2-2026", label: "Q2 2026", start: dateOf(2026, 4, 1), end: dateOf(2026, 6, 30), status: "closed" as const, completion: 1 },
  { key: "q3-2026", label: "Q3 2026", start: dateOf(2026, 7, 1), end: dateOf(2026, 9, 30), status: "in_progress" as const, completion: 0.65 },
];

const COURSES = [
  {
    key: "feedback",
    title: "Giving effective design feedback",
    category: "Communication",
    level: "core" as const,
    duration: "45m",
    summary: "A short course on giving actionable, kind design feedback.",
    article: {
      title: "The feedback sandwich isn't enough",
      subtitle: "A more useful framework for design critique",
      body: "## Why feedback fails\n\nMost design feedback is either too vague (\"I like it\") or too directive (\"move that button\").\n\n## A better framework\n\n1. **Observe** — describe what you see, without judgment.\n2. **Impact** — explain the effect on the user or goal.\n3. **Ask** — invite the designer's reasoning before suggesting a fix.\n",
    },
    quiz: { question: "What's the first step in the feedback framework?", correct: "Observe", wrong: ["Ask", "Impact"] },
  },
  {
    key: "design-systems",
    title: "Design Systems 101",
    category: "Craft",
    level: "core" as const,
    duration: "3h 20m",
    summary: "The fundamentals of building and maintaining a design system that scales.",
    article: {
      title: "What actually makes a design system work",
      subtitle: "Components are the easy part",
      body: "## Beyond the component library\n\nA design system is a set of shared decisions, not just a Figma file. Governance, versioning, and adoption tracking matter as much as the components themselves.\n\n## Getting adoption\n\nTrack usage, not just publication — a component nobody uses isn't solving anything.\n",
    },
    quiz: { question: "What matters most for design system adoption?", correct: "Tracking real usage", wrong: ["Publishing more components", "A bigger Figma file"] },
  },
  {
    key: "prototyping",
    title: "Advanced Prototyping in Figma",
    category: "Craft",
    level: "advanced" as const,
    duration: "4h 10m",
    summary: "Build higher-fidelity interactive prototypes for usability testing.",
    article: {
      title: "When low-fidelity isn't enough",
      subtitle: "Choosing the right prototype fidelity for the question you're asking",
      body: "## Match fidelity to the question\n\nTesting a flow's logic needs less fidelity than testing a specific interaction's feel.\n\n## Common pitfalls\n\nOver-investing in visual polish before the flow is validated wastes the most time.\n",
    },
    quiz: { question: "What should prototype fidelity match?", correct: "The question you're testing", wrong: ["The deadline", "The visual design file"] },
  },
  {
    key: "research",
    title: "Research & Usability Testing",
    category: "Craft",
    level: "core" as const,
    duration: "2h 45m",
    summary: "Running usability tests that produce decisions, not just notes.",
    article: {
      title: "Five users, real decisions",
      subtitle: "Getting signal out of a small usability study",
      body: "## Small samples, real signal\n\nFive participants surface most usability issues if the tasks are well scoped.\n\n## From notes to decisions\n\nGroup findings by severity and frequency before presenting them — raw notes rarely drive action.\n",
    },
    quiz: { question: "How many participants typically surface most usability issues?", correct: "Around five", wrong: ["At least fifty", "Just one"] },
  },
  {
    key: "critique",
    title: "Leading Design Critique",
    category: "Leadership",
    level: "advanced" as const,
    duration: "1h 30m",
    summary: "Running critique sessions that improve the work instead of just judging it.",
    article: {
      title: "Critique is a skill, not a personality trait",
      subtitle: "Structuring critique so it's useful, not just honest",
      body: "## Set the frame first\n\nState what stage the work is at and what kind of feedback is useful before opening the floor.\n\n## Keep it about the work\n\nRedirect personal-preference feedback (\"I'd have done it differently\") back to the goal.\n",
    },
    quiz: { question: "What should you set before opening a critique session?", correct: "The frame — stage and kind of feedback needed", wrong: ["A strict time limit only", "Nothing, just start"] },
  },
];

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "seed-org" },
    update: { name: "Acme Inc" },
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

  const teamIdByKey = { design: designTeam.id, pm: pmTeam.id } as const;

  // --- Members --------------------------------------------------------------
  const membersByKey = new Map<string, Awaited<ReturnType<typeof prisma.member.upsert>>>();
  for (const def of ALL_MEMBERS) {
    const member = await prisma.member.upsert({
      where: { email: def.email },
      update: {
        name: def.name,
        jobTitle: def.jobTitle,
        authRole: def.authRole,
        status: def.status,
        source: def.source,
        teamId: def.team ? teamIdByKey[def.team] : null,
        departmentId: def.key === "admin" ? null : productDept.id,
        location: def.location,
        phone: def.phone,
        empId: def.empId,
        joinedDate: def.joinedDate,
        workType: def.workType,
      },
      create: {
        orgId: org.id,
        name: def.name,
        email: def.email,
        jobTitle: def.jobTitle,
        authRole: def.authRole,
        status: def.status,
        source: def.source,
        teamId: def.team ? teamIdByKey[def.team] : null,
        departmentId: def.key === "admin" ? null : productDept.id,
        location: def.location,
        phone: def.phone,
        empId: def.empId,
        joinedDate: def.joinedDate,
        workType: def.workType,
      },
    });
    membersByKey.set(def.key, member);
  }

  const admin = membersByKey.get("admin")!;
  const hod = membersByKey.get("hod")!;
  const lea = membersByKey.get("lea")!;
  const priya = membersByKey.get("priya")!;

  await prisma.department.update({ where: { id: productDept.id }, data: { headMemberId: hod.id } });
  await prisma.team.update({ where: { id: designTeam.id }, data: { leadMemberId: lea.id } });
  await prisma.team.update({ where: { id: pmTeam.id }, data: { leadMemberId: priya.id } });

  // Report lines: managers report to the HOD; ICs report to their team lead.
  for (const def of ALL_MEMBERS) {
    if (def.key === "admin" || def.key === "hod") continue;
    const managerId = def.authRole === "manager" ? hod.id : def.team === "design" ? lea.id : priya.id;
    await prisma.member.update({ where: { id: membersByKey.get(def.key)!.id }, data: { managerId } });
  }

  // --- Review cycles + KPIs, one KPI set per cycle per team -----------------
  const cycleRecords = [];
  for (const c of CYCLES) {
    const cycle = await prisma.reviewCycle.upsert({
      where: { id: `seed-cycle-${c.key}` },
      update: { status: c.status, startDate: c.start, endDate: c.end },
      create: { id: `seed-cycle-${c.key}`, orgId: org.id, label: c.label, departmentId: productDept.id, status: c.status, startDate: c.start, endDate: c.end },
    });
    cycleRecords.push({ ...c, id: cycle.id });

    for (const [teamKey, defs] of [["design", DESIGN_KPIS] as const, ["pm", PM_KPIS] as const]) {
      const owner = teamKey === "design" ? lea : priya;
      for (const def of defs) {
        const kpi = await prisma.kpi.upsert({
          where: { id: `seed-kpi-${c.key}-${teamKey}-${def.key}` },
          update: {},
          create: {
            id: `seed-kpi-${c.key}-${teamKey}-${def.key}`,
            orgId: org.id,
            cycleId: cycle.id,
            ownerId: owner.id,
            name: def.name,
            metricType: def.metricType,
            direction: def.direction,
            targetValue: def.targetValue,
            targetNumeric: def.targetNumeric,
            unit: def.unit,
            cadence: "quarterly",
            status: "on",
          },
        });
        await prisma.kpiTeam.upsert({
          where: { kpiId_teamId: { kpiId: kpi.id, teamId: teamIdByKey[teamKey] } },
          update: { weightPct: def.weight },
          create: { kpiId: kpi.id, teamId: teamIdByKey[teamKey], weightPct: def.weight },
        });
      }
    }
  }

  // --- Reviews across cycles, producing real MemberKpiScore history ---------
  // Ratings are generated around each member's targetScore with a small
  // upward drift cycle-over-cycle so Analytics trend lines show real
  // (if modest) improvement, not a flat or fabricated-looking line.
  const REVIEW_COMMENTS = [
    "Consistently strong work this cycle — keep it up.",
    "Solid progress; still room to tighten turnaround.",
    "Great collaboration with the team, noticeable improvement.",
    "Good quarter overall, a couple of misses on deadlines.",
    "Clear communication and dependable delivery.",
  ];

  for (let cycleIdx = 0; cycleIdx < cycleRecords.length; cycleIdx++) {
    const cycle = cycleRecords[cycleIdx];
    const drift = cycleIdx * 0.1; // gentle upward trend across cycles

    for (const [teamKey, defs] of [["design", DESIGN_KPIS] as const, ["pm", PM_KPIS] as const]) {
      const teamMembers = ALL_MEMBERS.filter((m) => m.team === teamKey && m.status === "active");
      const manager = teamKey === "design" ? lea : priya;

      for (const memberDef of teamMembers) {
        const member = membersByKey.get(memberDef.key)!;
        const isManager = memberDef.authRole === "manager";
        const reviewer = isManager ? hod : manager;
        const willComplete = rand() < cycle.completion;

        const review = await prisma.review.upsert({
          where: { cycleId_revieweeId_reviewerId_type: { cycleId: cycle.id, revieweeId: member.id, reviewerId: reviewer.id, type: "manager" } },
          update: {},
          create: { cycleId: cycle.id, revieweeId: member.id, reviewerId: reviewer.id, type: "manager", status: willComplete ? "completed" : "in_progress" },
        });

        const ratings = defs.map((_, i) => clampRating(memberDef.targetScore + drift + (rand() - 0.5) * 1.2 + (i === 0 ? 0.1 : 0)));
        for (let i = 0; i < defs.length; i++) {
          await prisma.reviewKpiScore.upsert({
            where: { reviewId_kpiId: { reviewId: review.id, kpiId: `seed-kpi-${cycle.key}-${teamKey}-${defs[i].key}` } },
            update: { rating: ratings[i] },
            create: { reviewId: review.id, kpiId: `seed-kpi-${cycle.key}-${teamKey}-${defs[i].key}`, rating: ratings[i], comment: rand() < 0.4 ? pick(REVIEW_COMMENTS) : null },
          });
        }

        if (willComplete) {
          const weightedSum = ratings.reduce((s, r, i) => s + r * defs[i].weight, 0);
          const weightTotal = defs.reduce((s, k) => s + k.weight, 0);
          await prisma.review.update({
            where: { id: review.id },
            data: { status: "completed", submittedAt: new Date(cycle.end.getTime() - 3 * 86_400_000), overallScore: Math.round((weightedSum / weightTotal) * 100) / 100 },
          });
          for (let i = 0; i < defs.length; i++) {
            await prisma.memberKpiScore.upsert({
              where: { memberId_kpiId_cycleId: { memberId: member.id, kpiId: `seed-kpi-${cycle.key}-${teamKey}-${defs[i].key}`, cycleId: cycle.id } },
              update: { score: ratings[i] },
              create: { memberId: member.id, kpiId: `seed-kpi-${cycle.key}-${teamKey}-${defs[i].key}`, cycleId: cycle.id, score: ratings[i] },
            });
          }
        }

        // Self-review shell: completed for past cycles, still pending for the
        // in-progress one (feeds the "reviews to give" widget realistically).
        await prisma.review.upsert({
          where: { cycleId_revieweeId_reviewerId_type: { cycleId: cycle.id, revieweeId: member.id, reviewerId: member.id, type: "self" } },
          update: {},
          create: { cycleId: cycle.id, revieweeId: member.id, reviewerId: member.id, type: "self", status: cycle.status === "closed" ? "completed" : "pending" },
        });

        // One peer review per person per cycle, from a random teammate —
        // exercises peer-review data without overriding the manager score.
        const peers = teamMembers.filter((p) => p.key !== memberDef.key);
        if (peers.length > 0 && rand() < 0.7) {
          const peerDef = pick(peers);
          const peerReviewer = membersByKey.get(peerDef.key)!;
          const peerReview = await prisma.review.upsert({
            where: { cycleId_revieweeId_reviewerId_type: { cycleId: cycle.id, revieweeId: member.id, reviewerId: peerReviewer.id, type: "peer" } },
            update: {},
            create: { cycleId: cycle.id, revieweeId: member.id, reviewerId: peerReviewer.id, type: "peer", status: cycle.status === "closed" ? "completed" : "pending" },
          });
          if (cycle.status === "closed") {
            for (let i = 0; i < defs.length; i++) {
              const r = clampRating(memberDef.targetScore + drift + (rand() - 0.5) * 1.4);
              await prisma.reviewKpiScore.upsert({
                where: { reviewId_kpiId: { reviewId: peerReview.id, kpiId: `seed-kpi-${cycle.key}-${teamKey}-${defs[i].key}` } },
                update: { rating: r },
                create: { reviewId: peerReview.id, kpiId: `seed-kpi-${cycle.key}-${teamKey}-${defs[i].key}`, rating: r },
              });
            }
          }
        }
      }
    }
  }

  // --- Learning: five published courses with articles + quizzes ------------
  const courseIdByKey = new Map<string, string>();
  for (const c of COURSES) {
    const owner = c.category === "Leadership" ? hod : lea;
    const course = await prisma.course.upsert({
      where: { id: `seed-course-${c.key}` },
      update: {},
      create: { id: `seed-course-${c.key}`, orgId: org.id, ownerId: owner.id, title: c.title, category: c.category, level: c.level, duration: c.duration, summary: c.summary, status: "published" },
    });
    courseIdByKey.set(c.key, course.id);

    await prisma.courseArticle.upsert({
      where: { courseId: course.id },
      update: {},
      create: { courseId: course.id, title: c.article.title, subtitle: c.article.subtitle, bodyMarkdown: c.article.body },
    });

    const existingQuestions = await prisma.quizQuestion.findMany({ where: { courseId: course.id } });
    if (existingQuestions.length === 0) {
      await prisma.quizQuestion.create({
        data: {
          courseId: course.id,
          order: 0,
          text: c.quiz.question,
          options: {
            create: [
              { text: c.quiz.correct, isCorrect: true, order: 0 },
              ...c.quiz.wrong.map((text, i) => ({ text, isCorrect: false, order: i + 1 })),
            ],
          },
        },
      });
    }
  }

  // Assignments across the design + PM teams, with varied realistic progress.
  const learners = ALL_MEMBERS.filter((m) => m.status === "active" && m.authRole === "ic");
  const courseKeys = COURSES.map((c) => c.key);
  for (let i = 0; i < learners.length; i++) {
    const learnerDef = learners[i];
    const learner = membersByKey.get(learnerDef.key)!;
    const courseKey = courseKeys[i % courseKeys.length];
    const courseId = courseIdByKey.get(courseKey)!;
    const assignedBy = learnerDef.team === "design" ? lea : priya;

    const outcome = rand();
    const status = outcome < 0.35 ? "completed" : outcome < 0.7 ? "in_progress" : "not_started";
    const progressPct = status === "completed" ? 100 : status === "in_progress" ? 33 + Math.floor(rand() * 34) : 0;

    await prisma.learningAssignment.upsert({
      where: { memberId_courseId: { memberId: learner.id, courseId } },
      update: {},
      create: { memberId: learner.id, courseId, assignedById: assignedBy.id, status, progressPct, dueDate: daysAgo(-21) },
    });

    if (status !== "not_started") {
      await prisma.learnerProgress.upsert({
        where: { memberId_courseId: { memberId: learner.id, courseId } },
        update: {},
        create: {
          memberId: learner.id,
          courseId,
          videoDone: true,
          readingDone: status === "completed",
          quizDone: status === "completed",
          quizScore: status === "completed" ? 100 : null,
          completedAt: status === "completed" ? daysAgo(Math.floor(rand() * 10)) : null,
        },
      });
    }
  }

  // A second course assigned to a few people for variety in the catalog view.
  const secondWave = learners.slice(0, 4);
  for (const learnerDef of secondWave) {
    const learner = membersByKey.get(learnerDef.key)!;
    const courseId = courseIdByKey.get("design-systems")!;
    if (learnerDef.key === "noah") continue; // already has this via the round-robin above in some runs
    await prisma.learningAssignment.upsert({
      where: { memberId_courseId: { memberId: learner.id, courseId } },
      update: {},
      create: { memberId: learner.id, courseId, assignedById: lea.id, status: "not_started", dueDate: daysAgo(-14) },
    });
  }

  // --- Mood check-ins for the last 21 days, across several members ---------
  const moodMembers = ["noah", "emma", "aria", "sofia", "tomas", "hannah"] as const;
  const LOW_MOOD_REASONS = ["Tight deadline this week.", "Waiting on unblocked dependencies.", "Heavy review load."];
  for (const key of moodMembers) {
    const member = membersByKey.get(key)!;
    for (let i = 0; i < 21; i++) {
      const value = clampRating(3.6 + (rand() - 0.5) * 2.4);
      await prisma.moodCheckin.upsert({
        where: { memberId_date: { memberId: member.id, date: daysAgo(i) } },
        update: {},
        create: { memberId: member.id, date: daysAgo(i), value, reason: value <= 2 ? pick(LOW_MOOD_REASONS) : null },
      });
    }
  }

  // --- Lesson requests in every status --------------------------------------
  await prisma.lessonRequest.upsert({
    where: { id: "seed-lesson-request-1" },
    update: {},
    create: { id: "seed-lesson-request-1", memberId: membersByKey.get("emma")!.id, topic: "Prototyping in code, not just Figma", why: "I've been picking this up and want to share what I've learned.", status: "pending" },
  });
  await prisma.lessonRequest.upsert({
    where: { id: "seed-lesson-request-2" },
    update: {},
    create: {
      id: "seed-lesson-request-2",
      memberId: membersByKey.get("daniel")!.id,
      topic: "Motion design fundamentals for product UI",
      why: "We keep shipping static states — I'd like to teach the basics of purposeful motion.",
      status: "approved",
      decidedById: hod.id,
      decidedAt: daysAgo(6),
    },
  });
  await prisma.lessonRequest.upsert({
    where: { id: "seed-lesson-request-3" },
    update: {},
    create: {
      id: "seed-lesson-request-3",
      memberId: membersByKey.get("diego")!.id,
      topic: "Intro to SQL for PMs",
      why: "Want to help the team self-serve on basic data questions.",
      status: "declined",
      decidedById: hod.id,
      decidedAt: daysAgo(11),
    },
  });

  // --- Audit trail: realistic recent activity -------------------------------
  const activity: { actorId: string; verb: string; targetType: string; targetId: string; metadata?: Record<string, unknown>; daysAgo: number }[] = [
    { actorId: hod.id, verb: "started a review cycle", targetType: "ReviewCycle", targetId: cycleRecords[2].id, metadata: { label: "Q3 2026" }, daysAgo: 4 },
    { actorId: admin.id, verb: "invited", targetType: "Member", targetId: membersByKey.get("jordan")!.id, metadata: { name: "Jordan Alvarez" }, daysAgo: 2 },
    { actorId: admin.id, verb: "invited", targetType: "Member", targetId: membersByKey.get("mei")!.id, metadata: { name: "Mei Lin" }, daysAgo: 1 },
    { actorId: lea.id, verb: "submitted a review", targetType: "Member", targetId: membersByKey.get("noah")!.id, metadata: { reviewee: "Noah Kim" }, daysAgo: 5 },
    { actorId: priya.id, verb: "submitted a review", targetType: "Member", targetId: membersByKey.get("tomas")!.id, metadata: { reviewee: "Tomás Silva" }, daysAgo: 7 },
    { actorId: membersByKey.get("noah")!.id, verb: "submitted a self-review", targetType: "Member", targetId: membersByKey.get("noah")!.id, daysAgo: 9 },
    { actorId: hod.id, verb: "approved a lesson request", targetType: "LessonRequest", targetId: "seed-lesson-request-2", metadata: { topic: "Motion design fundamentals for product UI" }, daysAgo: 6 },
    { actorId: hod.id, verb: "declined a lesson request", targetType: "LessonRequest", targetId: "seed-lesson-request-3", metadata: { topic: "Intro to SQL for PMs" }, daysAgo: 11 },
    { actorId: membersByKey.get("sofia")!.id, verb: "completed a course", targetType: "Course", targetId: courseIdByKey.get("feedback")!, metadata: { title: "Giving effective design feedback" }, daysAgo: 3 },
    { actorId: membersByKey.get("aria")!.id, verb: "completed a course", targetType: "Course", targetId: courseIdByKey.get("research")!, metadata: { title: "Research & Usability Testing" }, daysAgo: 8 },
  ];
  for (const a of activity) {
    await prisma.auditLog.upsert({
      where: { id: `seed-audit-${a.targetType}-${a.targetId}-${a.verb.replace(/\s+/g, "_")}` },
      update: {},
      create: {
        id: `seed-audit-${a.targetType}-${a.targetId}-${a.verb.replace(/\s+/g, "_")}`,
        orgId: org.id,
        actorId: a.actorId,
        verb: a.verb,
        targetType: a.targetType,
        targetId: a.targetId,
        metadata: a.metadata as Prisma.InputJsonValue | undefined,
        createdAt: daysAgo(a.daysAgo),
      },
    });
  }

  console.log(`Seeded ${ALL_MEMBERS.length} members across 2 teams, 3 review cycles (2 closed, 1 in progress),`);
  console.log(`${COURSES.length} published courses, mood check-ins, lesson requests, and an activity trail.`);

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

// The seed is a long-lived local process making hundreds of sequential
// round trips against a hosted Postgres instance; an idle/held connection
// can get dropped mid-run (e.g. during a nested-write transaction) well
// before the script itself is done. Every write here is an upsert keyed by
// a deterministic id, so re-running `main()` from the top is always safe —
// retry a couple of times on a connection-level failure instead of dying.
function isTransientNetworkError(e: unknown): boolean {
  const parts: string[] = [];
  let cur: unknown = e;
  for (let i = 0; i < 5 && cur; i++) {
    if (cur instanceof Error) {
      parts.push(cur.message, cur.name);
      cur = (cur as { cause?: unknown }).cause;
    } else {
      parts.push(String(cur));
      break;
    }
  }
  const text = parts.join(" | ");
  return /connection error|not queryable|ECONNRESET|Connection terminated|EADDRNOTAVAIL|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|SocketTimeout|timed out|timeout|P1001|P1002|P1008|P1017/i.test(
    text,
  );
}

async function runWithRetries(attempts: number) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await main();
      return;
    } catch (e) {
      if (!isTransientNetworkError(e) || attempt === attempts) throw e;
      console.warn(`Seed hit a transient network error on attempt ${attempt}/${attempts}, retrying: ${e instanceof Error ? e.message : e}`);
      await prisma.$disconnect().catch(() => {});
      prisma = newPrismaClient();
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
}

runWithRetries(6)
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
