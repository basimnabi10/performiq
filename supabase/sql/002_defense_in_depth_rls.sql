-- Defense-in-depth only. The app's real authorization boundary is
-- lib/authz.ts, enforced in the Next.js server layer — Prisma connects with
-- a direct/pooled Postgres role that is NOT subject to RLS (it's the table
-- owner, or granted BYPASSRLS), so none of this policy set affects normal
-- app behavior.
--
-- What this DOES do: if a future contributor ever adds a direct
-- `supabase.from(...)` call from browser or server code using the anon or
-- authenticated key, that call hits deny-by-default RLS instead of silently
-- reading/writing data outside lib/authz.ts's checks. No policies are
-- defined below on purpose — this is a lock with no key, by design.
--
-- Run once via the Supabase SQL editor or CLI, after the Prisma migration
-- that creates these tables.

alter table public."Organization" enable row level security;
alter table public."Department" enable row level security;
alter table public."Team" enable row level security;
alter table public."Member" enable row level security;
alter table public."ReviewCycle" enable row level security;
alter table public."Review" enable row level security;
alter table public."ReviewKpiScore" enable row level security;
alter table public."ReviewAssignment" enable row level security;
alter table public."ReviewerGrant" enable row level security;
alter table public."Kpi" enable row level security;
alter table public."KpiTeam" enable row level security;
alter table public."MemberKpiScore" enable row level security;
alter table public."Course" enable row level security;
alter table public."CourseArticle" enable row level security;
alter table public."QuizQuestion" enable row level security;
alter table public."QuizOption" enable row level security;
alter table public."LearningAssignment" enable row level security;
alter table public."LearnerProgress" enable row level security;
alter table public."LessonRequest" enable row level security;
alter table public."MoodCheckin" enable row level security;
alter table public."CycleSnapshot" enable row level security;
alter table public."AuditLog" enable row level security;
