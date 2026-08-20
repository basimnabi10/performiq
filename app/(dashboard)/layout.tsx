import { redirect } from "next/navigation";
import { AuthzError, getCurrentMember } from "@/lib/authz";
import { Topbar } from "@/components/layout/Topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let member;
  try {
    member = await getCurrentMember();
  } catch (e) {
    if (e instanceof AuthzError) redirect("/login");
    throw e;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "28px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
      <Topbar name={member.name} />
      <main style={{ flex: 1, minHeight: 0 }}>{children}</main>
    </div>
  );
}
