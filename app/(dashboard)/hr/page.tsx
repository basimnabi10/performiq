import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { loadHrDashboard } from "@/lib/hr-data";
import { MonthPicker, type MonthOption } from "@/components/cycles/MonthPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { HrDashboard } from "@/components/hr/HrDashboard";

/**
 * HR's view of the review record, across every department.
 *
 * Read-only by construction: HR appears in no `requireRole` allowlist, so
 * every Server Action refuses it, and this page renders no control that
 * writes. Two things are deliberately absent — coaching notes, and the
 * written reason on a check-in. Both were promised to stay between a member
 * and their manager, and HR reading them would quietly break that.
 *
 * Only submitted reviews carry scores. A draft is someone's unfinished
 * thinking, not a judgement, so outstanding work is shown as something to
 * chase rather than as numbers to read.
 */
export default async function HrDashboardPage({ searchParams }: PageProps<"/hr">) {
  const actor = await getCurrentMember();
  if (actor.authRole !== "hr" && actor.authRole !== "admin") redirect("/dashboard");

  const { month: rawMonth } = await searchParams;
  const monthParam = Array.isArray(rawMonth) ? rawMonth[0] : rawMonth;

  const data = await loadHrDashboard(actor.orgId, monthParam);

  const monthOptions: MonthOption[] = data.months.map((m) => ({
    key: m.key,
    label: m.label,
    status: m.status as MonthOption["status"],
    daysLeft: m.daysLeft,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, maxWidth: 720 }}>
          <div style={{ fontSize: 13, color: "#767FA5", fontWeight: 500 }}>Company · read-only</div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", color: "#181835", marginTop: 2 }}>HR dashboard</div>
          <div style={{ fontSize: 14, color: "#596392", marginTop: 5, lineHeight: 1.55 }}>
            The review record for {data.selectedLabel}, across every department. Coaching notes and the reasons people
            write on their check-ins stay between them and their HOD, and are not shown here.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {monthOptions.length > 0 ? <MonthPicker months={monthOptions} selectedKey={data.selectedKey} /> : null}
          {data.selectedKey ? (
            <a
              href={`/api/hr/export?month=${data.selectedKey}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,.5)",
                border: "1px solid rgba(255,255,255,.7)",
                borderRadius: 14,
                padding: "0 18px",
                height: 44,
                font: "500 13px 'Switzer',sans-serif",
                color: "#252944",
                boxShadow: "0 6px 18px rgba(70,100,190,.08)",
                WebkitBackdropFilter: "blur(24px)",
                backdropFilter: "blur(24px)",
                textDecoration: "none",
              }}
            >
              <iconify-icon icon="ant-design:download-outlined" width="16" style={{ color: "#273FF9" }} />
              Export CSV
            </a>
          ) : null}
        </div>
      </div>

      {data.months.length === 0 ? (
        <EmptyState
          icon="ant-design:calendar-outlined"
          title="No review cycles yet"
          body="Nothing has been opened for review, so there is no record to show. Once a month opens, everything submitted in it appears here."
        />
      ) : (
        <HrDashboard data={data} />
      )}
    </div>
  );
}
