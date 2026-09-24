-- A quarter and a monthly cycle are scoped: org-wide (both scope columns
-- null), to a department, or to a team. The @@unique on
-- (orgId, year, index, departmentId, teamId) was meant to keep one row per
-- scope, but every scope shape leaves at least one of those columns null,
-- and Postgres treats nulls as distinct in a unique index. The constraint
-- therefore never rejected anything: an org-wide quarter could be inserted
-- any number of times, and so could a department's.
--
-- That is how production ended up with two Q3 2026 quarters for the same
-- department, each with its own September. `ensureQuarter` and `openCycle`
-- read before they write, but a cron run, a manual trigger and a deploy-time
-- call can overlap, and nothing underneath them said no.
--
-- Partial indexes, one per scope shape, say no. They are used instead of
-- UNIQUE NULLS NOT DISTINCT so the rule holds on Postgres 14 as well.

CREATE UNIQUE INDEX "Quarter_org_scope_key"
  ON "Quarter" ("orgId", "year", "index")
  WHERE "departmentId" IS NULL AND "teamId" IS NULL;

CREATE UNIQUE INDEX "Quarter_department_scope_key"
  ON "Quarter" ("orgId", "year", "index", "departmentId")
  WHERE "departmentId" IS NOT NULL;

CREATE UNIQUE INDEX "Quarter_team_scope_key"
  ON "Quarter" ("orgId", "year", "index", "teamId")
  WHERE "teamId" IS NOT NULL;

CREATE UNIQUE INDEX "ReviewCycle_org_scope_key"
  ON "ReviewCycle" ("orgId", "year", "month")
  WHERE "departmentId" IS NULL AND "teamId" IS NULL;

CREATE UNIQUE INDEX "ReviewCycle_department_scope_key"
  ON "ReviewCycle" ("orgId", "year", "month", "departmentId")
  WHERE "departmentId" IS NOT NULL;

CREATE UNIQUE INDEX "ReviewCycle_team_scope_key"
  ON "ReviewCycle" ("orgId", "year", "month", "teamId")
  WHERE "teamId" IS NOT NULL;
