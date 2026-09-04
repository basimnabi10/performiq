"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { assertWeightBudget } from "@/lib/kpi-weight";
import { createKpiSchema, createTeamKpiSchema, updateKpiTeamWeightSchema } from "@/lib/validation/kpis.schema";

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

// Single-team creation with inline weight-budget editing — the KPIs page's
// richer modal lets the user re-allocate existing weights on the same team
// while adding a new KPI, committed atomically in one transaction.
export const createTeamKpi = authActionClient
  .schema(createTeamKpiSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const team = await prisma.team.findUnique({ where: { id: parsedInput.teamId } });
    if (!team) throw new Error("Team not found.");
    await requireScopeAccess(actor, { teamId: team.id });

    const editIds = parsedInput.weightEdits.map((e) => e.kpiTeamId);
    if (editIds.length) {
      const rows = await prisma.kpiTeam.findMany({ where: { id: { in: editIds }, teamId: team.id } });
      if (rows.length !== editIds.length) {
        throw new Error("One or more KPI weights could not be found on this team.");
      }
    }

    const kpi = await prisma.$transaction(async (tx) => {
      for (const edit of parsedInput.weightEdits) {
        await tx.kpiTeam.update({ where: { id: edit.kpiTeamId }, data: { weightPct: edit.weightPct } });
      }

      await assertWeightBudget(tx, {
        teamId: team.id,
        cycleId: parsedInput.cycleId,
        addWeight: parsedInput.weightPct,
      });

      const created = await tx.kpi.create({
        data: {
          orgId: actor.orgId,
          cycleId: parsedInput.cycleId,
          ownerId: actor.id,
          name: parsedInput.name,
          description: parsedInput.detail,
          metricType: parsedInput.metricType,
          direction: parsedInput.direction,
          targetValue: parsedInput.targetValue,
          unit: parsedInput.unit,
          cadence: "quarterly",
          status: "new",
        },
      });

      await tx.kpiTeam.create({
        data: { kpiId: created.id, teamId: team.id, weightPct: parsedInput.weightPct },
      });

      return created;
    });

    revalidatePath("/kpis");
    revalidatePath(`/teams/${team.id}`);

    return { kpiId: kpi.id, name: parsedInput.name, weightPct: parsedInput.weightPct };
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
