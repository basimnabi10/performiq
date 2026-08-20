import "server-only";

import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

/**
 * Server-side re-validation of the weight budget — the client UI enforces
 * this too, but a client check is advisory only. Call inside the same
 * $transaction that writes the KpiTeam row(s) so the read-then-write is
 * atomic under concurrent edits.
 */
export async function assertWeightBudget(
  tx: Tx,
  args: { teamId: string; cycleId: string; addWeight: number; excludeKpiId?: string },
): Promise<void> {
  const rows = await tx.kpiTeam.findMany({
    where: {
      teamId: args.teamId,
      kpi: { cycleId: args.cycleId },
      ...(args.excludeKpiId ? { kpiId: { not: args.excludeKpiId } } : {}),
    },
    select: { weightPct: true },
  });

  const existing = rows.reduce((sum, r) => sum + r.weightPct, 0);
  const total = existing + args.addWeight;

  if (total > 100) {
    throw new Error(
      `This would put the team's KPI weight budget at ${total}% for this cycle (max 100%, currently ${existing}%).`,
    );
  }
}
