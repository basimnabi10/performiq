# PerformIQ

A team performance, growth & review platform: review cycles, weighted KPIs,
analytics, and a lightweight learning/LMS module. Built with Next.js 16 (App
Router), TypeScript, Tailwind CSS, Prisma 7, and Supabase (Postgres + Auth).

## Stack

- **Framework:** Next.js 16 (App Router, Server Actions via `next-safe-action`)
- **Database:** PostgreSQL via Prisma 7 (`@prisma/adapter-pg` driver adapter)
- **Auth:** Supabase Auth (`@supabase/ssr`) — email/password + invite links
- **Validation:** zod, shared between Server Actions and client forms
- **UI:** Tailwind CSS v4 + a small ported design-system component library
  (`components/ui/*` — frosted-glass cards, buttons, tags, etc.)

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com) and
   copy `.env.example` to `.env.local`, filling in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from
     Project Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` — same page, **server-only, never commit it**
   - `DATABASE_URL` — the pooled connection string (port 6543)
   - `DIRECT_URL` — the direct connection string (port 5432), used only by
     `prisma migrate`

3. **Apply the Supabase-specific SQL** (Prisma can't touch the `auth` schema,
   so this is a one-time manual step) — run both files in the Supabase SQL
   editor, in order:
   - `supabase/sql/001_member_auth_sync_trigger.sql` — links a Supabase auth
     user to its `Member` row on first sign-in
   - `supabase/sql/002_defense_in_depth_rls.sql` — enables deny-by-default RLS
     as a backstop (the app's real authorization boundary is `lib/authz.ts`,
     not RLS — see that file's header comment for why)

4. **Run the Prisma migration and seed data**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   The seed script creates an org, two teams, members across every role, a
   review cycle with weighted KPIs, a couple of completed reviews, a
   published course, and some mood check-ins — enough for every page to
   render real data. If `SUPABASE_SERVICE_ROLE_KEY` is a real key, it also
   creates a Supabase auth user for `admin@performiq.dev` (password from
   `ADMIN_SEED_PASSWORD`, default `Passw0rd!`) so you can log in immediately.
   Every other seeded member has `status: invited` — invite them for real
   (or use Supabase's dashboard to create/confirm a user with a matching
   email) to sign in as them.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build (also type-checks) |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply Prisma migrations (`prisma migrate dev`) |
| `npm run db:seed` | Run `prisma/seed.ts` |
| `npm run db:studio` | Open Prisma Studio |

`npm install` also runs `prisma generate` via `postinstall` — the generated
client lives in `lib/generated/prisma` (gitignored, regenerated on install).

## Architecture notes

- **Authorization boundary:** `lib/authz.ts`. Prisma connects with a direct
  Postgres role that bypasses Supabase RLS, so every Server Action and every
  gated page calls into this file (`getCurrentMember`, `requireRole`,
  `requireSelfOrRole`, `requireScopeAccess`) rather than re-implementing a
  check inline. RLS (`002_defense_in_depth_rls.sql`) is a backstop, not the
  primary control.
- **Mutations:** Server Actions (`actions/*.ts`), wrapped with
  `next-safe-action` (`lib/safe-action.ts`) for consistent auth + zod
  validation + error shaping. Reads are plain Server Components querying
  Prisma directly from `searchParams` — no parallel REST layer.
- **Scoring:** `lib/scoring.ts` computes a review's weighted overall score
  and rolls completed reviews into `MemberKpiScore`, the real
  per-member-per-KPI fact table analytics reads from (no fabricated data).
- **KPI weight budgets:** enforced server-side inside a transaction
  (`lib/kpi-weight.ts`) — a KPI's weight on a team can never push that
  team's cycle total over 100%, re-checked on every write, not just in the
  client form.
- **Quiz integrity:** `lib/quiz.ts` strips correct answers from any payload
  sent to a learner before they submit; grading happens server-side against
  the database.
- **Security headers / CSP:** set in `proxy.ts` (Next 16's renamed
  `middleware.ts`) with a per-request nonce for `script-src`.

## Deploying

This app is designed to deploy to any Node.js host (Vercel, etc.). Set the
same environment variables from `.env.example` in your hosting provider, and
make sure the Supabase SQL migration steps above have been applied to your
production database before the first deploy.
