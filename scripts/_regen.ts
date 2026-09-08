import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
loadEnv({ path: ".env.local" });
async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  // Delete + regenerate so the token is fresh and unconsumed
  const { data: list } = await supabase.auth.admin.listUsers();
  const u = list.users.find((x) => x.email === "temp-verify@performiq.dev");
  if (u) await supabase.auth.admin.deleteUser(u.id);
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "invite", email: "temp-verify@performiq.dev",
    options: { redirectTo: "http://localhost:3100/accept" },
  });
  if (error) { console.error(error.message); return; }
  console.log(data.properties?.action_link);
}
main();
