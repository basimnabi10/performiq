/**
 * Demo data: a head of department, four team members, and an HR account —
 * with KPIs, three months of reviews behind them and a current month left to
 * run live.
 *
 * The point is a demo that has something to show. Trends need more than one
 * month, a "team average" needs more than one person, and the current month
 * is deliberately left unreviewed so the loop can be walked on stage.
 *
 * Idempotent: run it twice and you get the same result, not duplicates.
 * Everything it creates is prefixed `demo-`, so seed-demo.mjs --undo can take
 * exactly its own rows back out and nothing else.
 *
 *   node --env-file=.env.production-migrate scripts/seed-demo.mjs --confirm
 *   node --env-file=.env.production-migrate scripts/seed-demo.mjs --undo
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

const UNDO = process.argv.includes("--undo");
if (!UNDO && !process.argv.includes("--confirm")) {
  console.log("This writes demo people and reviews. Re-run with --confirm (or --undo to remove them).");
  process.exit(1);
}

const db = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const q = (sql, params = []) => db.query(sql, params).then((r) => r.rows);

// --- undo -------------------------------------------------------------------
if (UNDO) {
  await db.query("begin");
  await db.query(`delete from "ReviewKpiScore" where "reviewId" in (select id from "Review" where id like 'demo-%')`);
  await db.query(`delete from "Review" where id like 'demo-%'`);
  await db.query(`delete from "MemberKpiScore" where "memberId" like 'demo-%' or "kpiId" like 'demo-%'`);
  await db.query(`delete from "MoodCheckin" where "memberId" like 'demo-%'`);
  await db.query(`delete from "KpiTeam" where "kpiId" like 'demo-%'`);
  await db.query(`delete from "Kpi" where id like 'demo-%'`);
  await db.query(`update "Team" set "leadMemberId" = null where "leadMemberId" like 'demo-%'`);
  await db.query(`update "Department" set "headMemberId" = null where "headMemberId" like 'demo-%'`);
  await db.query(`update "Member" set "managerId" = null where "managerId" like 'demo-%'`);
  const gone = await q(`select "authUserId" from "Member" where id like 'demo-%' and "authUserId" is not null`);
  await db.query(`delete from "Member" where id like 'demo-%'`);
  await db.query("commit");
  for (const m of gone) await admin.auth.admin.deleteUser(m.authUserId).catch(() => {});
  console.log(`removed the demo people, their reviews and their KPIs (${gone.length} logins revoked)`);
  await db.end();
  process.exit(0);
}

// --- where to put it --------------------------------------------------------
const [org] = await q(`select id from "Organization" limit 1`);
if (!org) throw new Error("No organization in this database.");

const [team] = await q(
  `select t.id, t.name, t."departmentId", d.name as dept
   from "Team" t join "Department" d on d.id = t."departmentId"
   order by (select count(*) from "Member" m where m."teamId" = t.id) desc limit 1`,
);
if (!team) throw new Error("No team to attach the demo to — create a department and team first.");
console.log(`seeding into ${team.dept} / ${team.name}`);

// --- people -----------------------------------------------------------------
const PEOPLE = [
  { id: "demo-hod", name: "Ayesha Khan", role: "hod", title: "Head of Engineering", email: "demo.hod@performiq.demo" },
  { id: "demo-hr", name: "Sana Malik", role: "hr", title: "People Partner", email: "demo.hr@performiq.demo" },
  { id: "demo-m1", name: "Bilal Ahmed", role: "ic", title: "Senior Engineer", email: "demo.bilal@performiq.demo" },
  { id: "demo-m2", name: "Hira Nawaz", role: "ic", title: "Engineer", email: "demo.hira@performiq.demo" },
  { id: "demo-m3", name: "Omar Sheikh", role: "ic", title: "Engineer", email: "demo.omar@performiq.demo" },
  { id: "demo-m4", name: "Zara Iqbal", role: "ic", title: "Junior Engineer", email: "demo.zara@performiq.demo" },
];

const secrets = ["# Demo logins. Delete this file when the demo is done.", ""];

for (const p of PEOPLE) {
  const password = randomBytes(15).toString("base64url");
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((u) => u.email === p.email);
  let authUserId;
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    authUserId = existing.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email: p.email, password, email_confirm: true });
    if (error) throw new Error(`${p.email}: ${error.message}`);
    authUserId = data.user.id;
  }

  // HR and the HOD are not scoped to a team; the members are.
  const onTeam = p.role === "ic";
  await db.query(
    `insert into "Member" (id, "orgId", email, name, "authRole", "jobTitle", "teamId", "departmentId", "authUserId", status, "joinedDate", "createdAt", "updatedAt")
     values ($1,$2,$3,$4,$5::"AuthRole",$6,$7,$8,$9,'active', now() - interval '18 months', now(), now())
     on conflict (id) do update set
       name = excluded.name, "authRole" = excluded."authRole", "jobTitle" = excluded."jobTitle",
       "teamId" = excluded."teamId", "departmentId" = excluded."departmentId",
       "authUserId" = excluded."authUserId", status = 'active', "updatedAt" = now()`,
    [p.id, org.id, p.email, p.name, p.role, p.title,
     onTeam ? team.id : null,
     p.role === "hr" ? null : team.departmentId,
     authUserId],
  );

  secrets.push(`# ${p.name} — ${p.role}`, `${p.id.toUpperCase().replace(/-/g, "_")}_EMAIL=${p.email}`, `${p.id.toUpperCase().replace(/-/g, "_")}_PASSWORD=${password}`, "");
}

// The HOD runs the team and reviews everyone on it.
await db.query(`update "Member" set "managerId" = 'demo-hod' where id in ('demo-m1','demo-m2','demo-m3','demo-m4')`);
await db.query(`update "Team" set "leadMemberId" = 'demo-hod' where id = $1`, [team.id]);
await db.query(`update "Department" set "headMemberId" = 'demo-hod' where id = $1 and "headMemberId" is null`, [team.departmentId]);
console.log(`created ${PEOPLE.length} people (1 head of department, 1 HR, 4 team members)`);

// --- the quarter the current cycle belongs to -------------------------------
const [cycle] = await q(
  `select id, "quarterId", year, month from "ReviewCycle"
   where "orgId" = $1 and status = 'in_progress'
     and ("departmentId" = $2 or "departmentId" is null)
   order by "startDate" desc limit 1`,
  [org.id, team.departmentId],
);
if (!cycle?.quarterId) throw new Error("No open cycle for that department — open this month first.");

// --- KPIs -------------------------------------------------------------------
const KPIS = [
  ["demo-kpi-delivery", "Delivery", "Ships committed work at a predictable pace.", 25],
  ["demo-kpi-quality", "Code quality", "Readable, tested work that holds up in review.", 25],
  ["demo-kpi-ownership", "Ownership", "Takes a problem end to end without being chased.", 20],
  ["demo-kpi-collab", "Collaboration", "Unblocks others and works well across teams.", 20],
  ["demo-kpi-growth", "Growth", "Acts on feedback and takes on harder work.", 10],
];

for (const [id, name, description, weight] of KPIS) {
  await db.query(
    `insert into "Kpi" (id, "orgId", "quarterId", "ownerId", name, description, "metricType", direction, "targetValue", cadence, lifecycle, status, "createdAt", "updatedAt")
     values ($1,$2,$3,'demo-hod',$4,$5,'rating','higher_is_better','','quarterly','active','new', now(), now())
     on conflict (id) do update set name = excluded.name, description = excluded.description, "quarterId" = excluded."quarterId", "updatedAt" = now()`,
    [id, org.id, cycle.quarterId, name, description],
  );
  await db.query(
    `insert into "KpiTeam" (id, "kpiId", "teamId", "weightPct", "createdAt")
     values ($1,$2,$3,$4, now()) on conflict ("kpiId","teamId") do update set "weightPct" = excluded."weightPct"`,
    [`${id}-kt`, id, team.id, weight],
  );
}
console.log(`created ${KPIS.length} KPIs totalling 100% on ${team.name}`);

// --- history ----------------------------------------------------------------
// Two closed months behind the current one, so a trend line has something to
// draw and "up from last month" means something.
const MEMBERS = ["demo-m1", "demo-m2", "demo-m3", "demo-m4"];
const PROFILE = {
  "demo-m1": [4.2, 4.4, 4.6],
  "demo-m2": [3.4, 3.6, 3.9],
  "demo-m3": [4.0, 3.8, 4.1],
  "demo-m4": [2.9, 3.2, 3.5],
};

const past = [];
for (let back = 2; back >= 1; back--) {
  const d = new Date(Date.UTC(cycle.year, cycle.month - 1 - back, 1));
  past.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
}

let reviewsMade = 0;
for (const [i, period] of past.entries()) {
  const label = new Date(Date.UTC(period.year, period.month - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const start = new Date(Date.UTC(period.year, period.month - 1, 1));
  const end = new Date(Date.UTC(period.year, period.month, 0, 23, 59, 59));

  // One cycle per department per month is enforced by a partial index, so an
  // existing month is reused rather than duplicated — the demo attaches to
  // whatever history is already there.
  const [already] = await q(
    `select id from "ReviewCycle"
     where "orgId" = $1 and year = $2 and month = $3
       and "departmentId" is not distinct from $4 limit 1`,
    [org.id, period.year, period.month, team.departmentId],
  );

  let cycleId = already?.id;
  if (!cycleId) {
    cycleId = `demo-cycle-${period.year}-${period.month}`;
    await db.query(
      `insert into "ReviewCycle" (id, "orgId", "quarterId", label, year, month, "departmentId", status, "startDate", "endDate", "createdAt")
       values ($1,$2,$3,$4,$5,$6,$7,'closed',$8,$9, now())
       on conflict (id) do update set status = 'closed', label = excluded.label`,
      [cycleId, org.id, cycle.quarterId, label, period.year, period.month, team.departmentId, start, end],
    );
  }

  for (const memberId of MEMBERS) {
    const target = PROFILE[memberId][i];
    const reviewId = `demo-rev-${memberId}-${period.year}-${period.month}`;
    const submitted = new Date(Date.UTC(period.year, period.month - 1, 25));

    await db.query(
      `insert into "Review" (id, "cycleId", "revieweeId", "reviewerId", type, status, "submittedAt", "overallScore", "createdAt", "updatedAt")
       values ($1,$2,$3,'demo-hod','manager','completed',$4,$5, now(), now())
       on conflict (id) do update set status='completed', "overallScore" = excluded."overallScore", "submittedAt" = excluded."submittedAt"`,
      [reviewId, cycleId, memberId, submitted, target.toFixed(2)],
    );

    await db.query(`delete from "ReviewKpiScore" where "reviewId" = $1`, [reviewId]);
    for (const [kpiId] of KPIS) {
      // Ratings scatter around the person's level rather than all matching it.
      const rating = Math.max(1, Math.min(5, Math.round(target + (Math.random() - 0.5))));
      await db.query(
        `insert into "ReviewKpiScore" (id, "reviewId", "kpiId", rating, "createdAt")
         values ($1,$2,$3,$4, now()) on conflict ("reviewId","kpiId") do update set rating = excluded.rating`,
        [`${reviewId}-${kpiId}`, reviewId, kpiId, rating],
      );
      await db.query(
        `insert into "MemberKpiScore" (id, "memberId", "kpiId", "cycleId", score, "sourceCount", "computedAt")
         values ($1,$2,$3,$4,$5,1, now())
         on conflict ("memberId","kpiId","cycleId") do update set score = excluded.score`,
        [`${reviewId}-${kpiId}-ms`, memberId, kpiId, cycleId, rating],
      );
    }
    reviewsMade++;
  }
}
console.log(`created ${reviewsMade} submitted reviews across ${past.length} closed months`);

// --- this month, left to run ------------------------------------------------
let pending = 0;
for (const memberId of MEMBERS) {
  await db.query(
    `insert into "Review" (id, "cycleId", "revieweeId", "reviewerId", type, status, "createdAt", "updatedAt")
     values ($1,$2,$3,'demo-hod','manager','pending', now(), now())
     on conflict (id) do update set status = 'pending', "overallScore" = null, "submittedAt" = null`,
    [`demo-rev-${memberId}-current`, cycle.id, memberId],
  );
  pending++;
}
console.log(`left ${pending} reviews pending in the current month, for the demo to run`);

// --- a little engagement signal ---------------------------------------------
const monday = new Date();
monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
const week = monday.toISOString().slice(0, 10);
const moods = [["demo-m1", 5, null], ["demo-m2", 3, "Lot of context switching this week."], ["demo-m3", 4, null]];
for (const [memberId, value, reason] of moods) {
  await db.query(
    `insert into "MoodCheckin" (id, "memberId", date, value, reason, "createdAt")
     values ($1,$2,$3::date,$4,$5, now()) on conflict ("memberId", date) do nothing`,
    [`demo-mood-${memberId}`, memberId, week, value, reason],
  );
}
console.log(`added ${moods.length} check-ins for the current week`);

fs.writeFileSync(".env.local.demo-accounts", secrets.join("\n"));
console.log("\nlogins written to .env.local.demo-accounts (gitignored) — delete it when the demo is done");
await db.end();
