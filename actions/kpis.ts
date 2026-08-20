"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { assertWeightBudget } from "@/lib/kpi-weight";
import { createKpiSchema, updateKpiTeamWeightSchema } from "@/lib/validation/kpis.schema";

export const createKpi = authActionClient
  .schema(createKpiSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const teams = await prisma.team.findMany({
      where: { id: { in: parsedInput.teamWeights.map((t) => t.teamId) } },
    });
    if (teams.length !== parsedInput.teamWeights.length) {
      throw new Error("One or more selected teams could not be found.");
    }
    for (const team of teams) {
      await requireScopeAccess(actor, { teamId: team.id });
    }

    const kpi = await prisma.$transaction(async (tx) => {
      for (const tw of parsedInput.teamWeights) {
        await assertWeightBudget(tx, {
          teamId: tw.teamId,
          cycleId: parsedInput.cycleId,
          addWeight: tw.weightPct,
        });
      }

      const created = await tx.kpi.create({
        data: {
          orgId: actor.orgId,
          cycleId: parsedInput.cycleId,
          ownerId: actor.id,
          name: parsedInput.name,
          description: parsedInput.description,
          metricType: parsedInput.metricType,
          direction: parsedInput.direction,
          targetValue: parsedInput.targetValue,
          unit: parsedInput.unit,
          cadence: parsedInput.cadence,
          status: "new",
        },
      });

      await tx.kpiTeam.createMany({
        data: parsedInput.teamWeights.map((tw) => ({
          kpiId: created.id,
          teamId: tw.teamId,
          weightPct: tw.weightPct,
        })),
      });

      return created;
    });

    for (const team of teams) {
      revalidatePath(`/teams/${team.id}`);
    }

    return { kpiId: kpi.id };
  });

export const updateKpiTeamWeight = authActionClient
  .schema(updateKpiTeamWeightSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const kpiTeam = await prisma.kpiTeam.findUnique({
      where: { id: parsedInput.kpiTeamId },
      include: { kpi: { select: { cycleId: true } } },
    });
    if (!kpiTeam) throw new Error("KPI not found on this team.");
    await requireScopeAccess(actor, { teamId: kpiTeam.teamId });

    await prisma.$transaction(async (tx) => {
      await assertWeightBudget(tx, {
        teamId: kpiTeam.teamId,
        cycleId: kpiTeam.kpi.cycleId,
        addWeight: parsedInput.weightPct,
        excludeKpiId: kpiTeam.kpiId,
      });
      await tx.kpiTeam.update({
        where: { id: kpiTeam.id },
        data: { weightPct: parsedInput.weightPct },
      });
    });

    revalidatePath(`/teams/${kpiTeam.teamId}`);
  });
