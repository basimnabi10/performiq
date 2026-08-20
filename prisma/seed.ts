/**
 * Seed skeleton for Phase A — enough to exercise login end-to-end (one org,
 * two departments/teams, a handful of members across every auth role). The
 * full realistic dataset (KPIs, reviews, courses, mood history, etc.) is a
 * Phase F deliverable once every model has real read/write paths to seed
 * meaningfully against.
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

  await prisma.department.update({
    where: { id: productDept.id },
    data: { headMemberId: hod.id },
  });

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

  await prisma.member.upsert({
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

  console.log("Seeded org, departments, teams, and 5 members.");

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
