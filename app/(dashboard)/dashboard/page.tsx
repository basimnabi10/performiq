import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";

/** Role-aware entry point — sends each person to their scoped dashboard. */
export default async function DashboardPage() {
  const member = await getCurrentMember();

  if (member.authRole === "admin" || member.authRole === "hod") {
    redirect("/hod-dashboard");
  }
  redirect("/my-dashboard");
}
