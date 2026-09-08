import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
loadEnv({ path: ".env.local" });
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) });
const EMAIL = "temp-verify@performiq.dev";

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const team = await prisma.team.findFirst();
  const org = await prisma.organization.findFirstOrThrow();

  // generateLink creates the auth user WITHOUT sending an email
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "invite",
    email: EMAIL,
    options: { redirectTo: "http://localhost:3100/accept" },
  });
  if (error) { console.error("generateLink:", error.message); return; }

  await prisma.member.upsert({
    where: { email: EMAIL },
    update: {},
    create: {
      orgId: org.id, email: EMAIL, name: "Temp Verify", teamId: team?.id ?? null,
      departmentId: team?.departmentId ?? null, status: "invited", authRole: "ic",
    },
  });
  console.log("ACTION_LINK:", data.properties?.action_link);
}
main().finally(() => prisma.$disconnect());
