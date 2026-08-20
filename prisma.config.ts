import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js convention: .env.local holds real secrets and isn't committed.
// The Prisma CLI doesn't know that convention on its own, so load it here.
loadEnv({ path: ".env.local" });

// CLI-only config (migrate, db push, studio). Uses the DIRECT (non-pooled)
// connection — Supabase's pooled port doesn't support the advisory locks
// migrations need. The runtime PrismaClient (lib/prisma.ts) uses the pooled
// DATABASE_URL via a driver adapter instead, independent of this file.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
