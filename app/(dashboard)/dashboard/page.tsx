import { getCurrentMember } from "@/lib/authz";
import { FrostCard } from "@/components/ui/FrostCard";

export default async function DashboardPage() {
  const member = await getCurrentMember();

  return (
    <FrostCard tone="ink" style={{ maxWidth: 520 }}>
      <div className="piq-display" style={{ color: "#fff" }}>
        Good to see you, {member.name.split(" ")[0]}
      </div>
      <div className="piq-body" style={{ color: "#A8AFCB", marginTop: 10 }}>
        Signed in as {member.email} · role: {member.authRole}. The full bento
        dashboard lands in the next build phase.
      </div>
    </FrostCard>
  );
}
