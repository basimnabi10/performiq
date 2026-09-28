/**
 * Throwaway sign-ins for checking the app on localhost.
 *
 * Creates one confirmed account per role in the DEV Supabase project, with
 * generated passwords written to .env.local.test-accounts (gitignored by the
 * .env* rule). Nothing here touches the real accounts, and nothing here
 * should ever be pointed at production.
 *
 *   node --env-file=.env.local scripts/make-test-accounts.mjs
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (url.includes("rkjeyyfyiltnygraxouh")) {
  throw new Error("That is the production project. These accounts are for dev only.");
}

const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const db = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const ORG = "seed-org";
const DEPT = "seed-dept-product";
const TEAM_DESIGN = "seed-team-design";

const ACCOUNTS = [
  { key: "ADMIN", email: "qa.admin@performiq.test", name: "QA Admin", role: "admin", team: null, dept: null },
  { key: "HOD", email: "qa.hod@performiq.test", name: "QA Head", role: "hod", team: TEAM_DESIGN, dept: DEPT },
  { key: "HR", email: "qa.hr@performiq.test", name: "QA People", role: "hr", team: null, dept: null },
  { key: "MEMBER", email: "qa.member@performiq.test", name: "QA Member", role: "ic", team: TEAM_DESIGN, dept: DEPT },
];

const lines = ["# Throwaway logins for checking localhost. Dev project only.", ""];

for (const a of ACCOUNTS) {
  const password = randomBytes(18).toString("base64url");

  // Reuse the auth user if a previous run made one, so this is repeatable.
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((u) => u.email === a.email);

  let userId;
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    userId = existing.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: a.email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`${a.email}: ${error.message}`);
    userId = data.user.id;
  }

  await db.query(
    `insert into "Member" (id, "orgId", email, name, "authRole", "teamId", "departmentId", "authUserId", status, "jobTitle", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, $5::"AuthRole", $6, $7, $8, 'active', $9, now(), now())
     on conflict (email) do update set
       "authRole" = excluded."authRole", "teamId" = excluded."teamId",
       "departmentId" = excluded."departmentId", "authUserId" = excluded."authUserId",
       name = excluded.name, status = 'active', "updatedAt" = now()`,
    [`qa-${a.role}`, ORG, a.email, a.name, a.role, a.team, a.dept, userId, `QA ${a.role}`],
  );

  lines.push(`${a.key}_EMAIL=${a.email}`, `${a.key}_PASSWORD=${password}`, "");
  console.log(`ready: ${a.email.padEnd(28)} role=${a.role}`);
}

fs.writeFileSync(".env.local.test-accounts", lines.join("\n"));
console.log("\ncredentials written to .env.local.test-accounts (gitignored)");
await db.end();
