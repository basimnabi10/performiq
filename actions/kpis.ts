"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { AuthzError, requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { assertWeightBudget } from "@/lib/kpi-weight";
import { formatKpiMeasurement } from "@/lib/kpi-status";
import { logActivity } from "@/lib/audit";
import {
  createKpiSchema,
  createTeamKpiSchema,
  updateKpiCurrentSchema,
  updateKpiTeamWeightSchema,
  createKpiCategorySchema,
  importKpisSchema,
  adoptKpiSchema,
  setKpiShareableSchema,
  updateKpiSchema,
  setKpiLifecycleSchema,
} from "@/lib/validation/kpis.schema";

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

    // A KPI hangs off one quarter, and a quarter belongs to one department.
    // Applying it to a team in another department would file it under that
    // department's quarter, where the team's own KPI page — which resolves
    // the quarter from the team — would never look for it.
    const quarter = await prisma.quarter.findUnique({
      where: { id: parsedInput.quarterId },
      select: { departmentId: true, teamId: true },
    });
    if (!quarter) throw new Error("That quarter no longer exists.");
    if (quarter.departmentId) {
      const strays = teams.filter((t) => t.departmentId !== quarter.departmentId);
      if (strays.length) {
        throw new Error(
          `${strays.map((t) => t.name).join(" and ")} ${strays.length === 1 ? "is" : "are"} in a different department, which runs its own quarter. Create the KPI from that department's KPI page instead.`,
        );
      }
    }
    for (const team of teams) {
      await requireScopeAccess(actor, { teamId: team.id });
    }

    const editIds = parsedInput.weightEdits.map((e) => e.kpiTeamId);
    if (editIds.length) {
      const rows = await prisma.kpiTeam.findMany({
        where: { id: { in: editIds }, kpi: { orgId: actor.orgId, quarterId: parsedInput.quarterId } },
        select: { id: true },
      });
      if (rows.length !== editIds.length) {
        throw new Error("A weight you adjusted belongs to a different quarter.");
      }
    }

    // KPIs the wizard rebalanced to the same weight can move in one statement,
    // which keeps the transaction to a handful of round-trips however many
    // KPIs the team already has.
    const byWeight = new Map<number, string[]>();
    for (const edit of parsedInput.weightEdits) {
      const ids = byWeight.get(edit.weightPct);
      if (ids) ids.push(edit.kpiTeamId);
      else byWeight.set(edit.weightPct, [edit.kpiTeamId]);
    }

    const kpi = await prisma.$transaction(async (tx) => {
      // The wizard may have lowered other KPIs to make room. Those edits are
      // part of the same decision, so they are applied in the same
      // transaction: applying one without the other leaves a team either over
      // 100% or with weight taken away for a KPI that never arrived.
      for (const [weightPct, ids] of byWeight) {
        await tx.kpiTeam.updateMany({ where: { id: { in: ids } }, data: { weightPct } });
      }

      for (const tw of parsedInput.teamWeights) {
        await assertWeightBudget(tx, {
          teamId: tw.teamId,
          quarterId: parsedInput.quarterId,
          addWeight: tw.weightPct,
        });
      }

      const created = await tx.kpi.create({
        data: {
          orgId: actor.orgId,
          quarterId: parsedInput.quarterId,
          ownerId: actor.id,
          name: parsedInput.name,
          categoryId: parsedInput.categoryId || null,
          rubric: parsedInput.rubric || null,
          description: parsedInput.description,
          metricType: "rating",
          direction: "higher_is_better",
          targetValue: "",
          unit: null,
          cadence: parsedInput.cadence,
          lifecycle: parsedInput.lifecycle,
          shareable: parsedInput.shareable,
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
    }, { timeout: 20000, maxWait: 10000 });

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
        quarterId: parsedInput.quarterId,
        addWeight: parsedInput.weightPct,
      });

      const created = await tx.kpi.create({
        data: {
          orgId: actor.orgId,
          quarterId: parsedInput.quarterId,
          ownerId: actor.id,
          name: parsedInput.name,
          categoryId: parsedInput.categoryId || null,
          rubric: parsedInput.rubric || null,
          description: parsedInput.detail,
          metricType: "rating",
          direction: "higher_is_better",
          targetValue: "",
          unit: null,
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
      include: { kpi: { select: { quarterId: true } } },
    });
    if (!kpiTeam) throw new Error("KPI not found on this team.");
    await requireScopeAccess(actor, { teamId: kpiTeam.teamId });

    await prisma.$transaction(async (tx) => {
      await assertWeightBudget(tx, {
        teamId: kpiTeam.teamId,
        quarterId: kpiTeam.kpi.quarterId,
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

/**
 * Records the KPI's actual measured value for this cycle (e.g. "93" for a
 * "≥ 90%" KPI). Nothing in the app can observe these real-world numbers, so
 * they're entered by hand in the KPI manager — this is what makes the
 * "Current" column and its on/below-target badge real rather than blank.
 */
export const updateKpiCurrent = authActionClient
  .schema(updateKpiCurrentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const kpi = await prisma.kpi.findUnique({
      where: { id: parsedInput.kpiId },
      include: { kpiTeams: { select: { teamId: true } } },
    });
    if (!kpi || kpi.orgId !== actor.orgId) throw new Error("KPI not found.");
    // A KPI can span teams — the actor needs access to at least one of them.
    let allowed = actor.authRole === "admin";
    for (const kt of kpi.kpiTeams) {
      if (allowed) break;
      try {
        await requireScopeAccess(actor, { teamId: kt.teamId });
        allowed = true;
      } catch {
        // try the next team this KPI applies to
      }
    }
    if (!allowed) throw new AuthzError("This KPI is outside your scope.");

    const cleared = parsedInput.currentValue === "";
    const numeric = cleared ? null : Number(parsedInput.currentValue);

    await prisma.kpi.update({
      where: { id: kpi.id },
      data: {
        currentValue: cleared ? null : formatKpiMeasurement(numeric as number, kpi.metricType),
        currentNumeric: numeric,
        currentUpdatedAt: cleared ? null : new Date(),
      },
    });

    revalidatePath("/kpis");
    for (const kt of kpi.kpiTeams) revalidatePath(`/teams/${kt.teamId}`);
  });

/**
 * Adds a KPI category (Performance, Professionalism, Growth ship by default).
 *
 * Org-wide rather than per-department: the same category has to mean the same
 * thing everywhere, or two departments invent different names for the same
 * idea and scores stop being comparable across teams.
 */
export const createKpiCategory = authActionClient
  .schema(createKpiCategorySchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const name = parsedInput.name.trim();
    const existing = await prisma.kpiCategory.findFirst({
      where: { orgId: actor.orgId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      // Not an error worth stopping for — the caller wanted a category with
      // this name and one exists, so hand back the one that does.
      return { categoryId: existing.id, name: existing.name, created: false };
    }

    const category = await prisma.kpiCategory.create({
      data: { orgId: actor.orgId, name },
    });

    revalidatePath("/kpis");
    return { categoryId: category.id, name: category.name, created: true };
  });

/**
 * Bulk-creates KPIs for one team from an uploaded sheet.
 *
 * Imported as DRAFTS regardless of what the file says. A spreadsheet is the
 * easiest way to get twenty KPIs slightly wrong, and a draft can be corrected
 * before anyone is scored against it -- whereas an active KPI with a typo in
 * its target is already shaping a review.
 *
 * Categories are matched by name and created when missing, so a sheet listing
 * "Professionalism" does not silently import with no category because of a
 * capital letter.
 */
export const importKpis = authActionClient
  .schema(importKpisSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const team = await prisma.team.findUnique({ where: { id: parsedInput.teamId } });
    if (!team || team.orgId !== actor.orgId) throw new Error("Team not found.");
    await requireScopeAccess(actor, { teamId: team.id, departmentId: team.departmentId });

    const existingNames = new Set(
      (
        await prisma.kpi.findMany({
          where: { quarterId: parsedInput.quarterId, kpiTeams: { some: { teamId: team.id } } },
          select: { name: true },
        })
      ).map((k) => k.name.toLowerCase()),
    );

    const skipped: string[] = [];
    const created: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const row of parsedInput.rows) {
        if (existingNames.has(row.name.toLowerCase())) {
          // Importing the same sheet twice should not double every KPI.
          skipped.push(row.name);
          continue;
        }

        let categoryId: string | null = null;
        if (row.categoryName) {
          const match = await tx.kpiCategory.findFirst({
            where: { orgId: actor.orgId, name: { equals: row.categoryName, mode: "insensitive" } },
          });
          categoryId =
            match?.id ??
            (await tx.kpiCategory.create({ data: { orgId: actor.orgId, name: row.categoryName } })).id;
        }

        // The same 100% rule the form enforces. A sheet is the easiest way to
        // blow the budget without noticing, and a team quietly at 130% makes
        // every weighted score on it wrong.
        await assertWeightBudget(tx, {
          teamId: team.id,
          quarterId: parsedInput.quarterId,
          addWeight: row.weightPct,
        });

        const kpi = await tx.kpi.create({
          data: {
            orgId: actor.orgId,
            quarterId: parsedInput.quarterId,
            ownerId: actor.id,
            name: row.name,
            description: row.description || null,
            categoryId,
            rubric: row.rubric || null,
            metricType: row.metricType,
            direction: row.direction,
            targetValue: row.targetValue,
            unit: row.unit || null,
            cadence: "quarterly",
            lifecycle: "draft",
            status: "new",
          },
        });

        await tx.kpiTeam.create({
          data: { kpiId: kpi.id, teamId: team.id, weightPct: row.weightPct },
        });

        existingNames.add(row.name.toLowerCase());
        created.push(row.name);
      }
    });

    revalidatePath("/kpis");
    return { created: created.length, skipped };
  });

/**
 * Adds an existing organization KPI to a team.
 *
 * Creates a link, not a copy: the same KPI is used by several teams at
 * different weights, so a change to its wording or target reaches everyone
 * using it and scores stay comparable across teams. Copying would let
 * "Communication" quietly become five different things.
 */
export const adoptKpi = authActionClient
  .schema(adoptKpiSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const [kpi, team] = await Promise.all([
      prisma.kpi.findUnique({ where: { id: parsedInput.kpiId } }),
      prisma.team.findUnique({ where: { id: parsedInput.teamId } }),
    ]);
    if (!kpi || kpi.orgId !== actor.orgId) throw new Error("KPI not found.");
    if (!team || team.orgId !== actor.orgId) throw new Error("Team not found.");
    if (!kpi.shareable) throw new Error("That KPI is not shared with other teams.");
    await requireScopeAccess(actor, { teamId: team.id, departmentId: team.departmentId });

    // Adopting links the team to the existing KPI, which stays on its own
    // quarter. Across departments that quarter is the wrong one and the KPI
    // would not appear on this team's page at all.
    const kpiQuarter = await prisma.quarter.findUnique({
      where: { id: kpi.quarterId },
      select: { departmentId: true },
    });
    if (kpiQuarter?.departmentId && kpiQuarter.departmentId !== team.departmentId) {
      throw new Error(
        `${kpi.name} belongs to another department's quarter, so ${team.name} cannot use it directly. Recreate it on this department's KPI page.`,
      );
    }

    const already = await prisma.kpiTeam.findUnique({
      where: { kpiId_teamId: { kpiId: kpi.id, teamId: team.id } },
    });
    if (already) throw new Error(`${team.name} already uses ${kpi.name}.`);

    await prisma.$transaction(async (tx) => {
      await assertWeightBudget(tx, {
        teamId: team.id,
        quarterId: kpi.quarterId,
        addWeight: parsedInput.weightPct,
      });
      await tx.kpiTeam.create({
        data: { kpiId: kpi.id, teamId: team.id, weightPct: parsedInput.weightPct },
      });
    });

    revalidatePath("/kpis");
    return { kpiName: kpi.name, teamName: team.name };
  });

/** Publishes a KPI to the org library, or withdraws it. */
export const setKpiShareable = authActionClient
  .schema(setKpiShareableSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const kpi = await prisma.kpi.findUnique({ where: { id: parsedInput.kpiId } });
    if (!kpi || kpi.orgId !== actor.orgId) throw new Error("KPI not found.");

    await prisma.kpi.update({ where: { id: kpi.id }, data: { shareable: parsedInput.shareable } });
    revalidatePath("/kpis");
    return { shareable: parsedInput.shareable };
  });

/**
 * Edits a KPI in place. Its weight is not here: a KPI carries a different
 * weight on every team that uses it, so weights are edited per team against
 * that team's 100% budget.
 */
export const updateKpi = authActionClient
  .schema(updateKpiSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const kpi = await prisma.kpi.findUnique({
      where: { id: parsedInput.kpiId },
      include: { kpiTeams: { select: { teamId: true } } },
    });
    if (!kpi || kpi.orgId !== actor.orgId) throw new Error("KPI not found.");
    for (const kt of kpi.kpiTeams) await requireScopeAccess(actor, { teamId: kt.teamId });

    await prisma.kpi.update({
      where: { id: kpi.id },
      data: {
        name: parsedInput.name,
        description: parsedInput.description || null,
        categoryId: parsedInput.categoryId || null,
        rubric: parsedInput.rubric || null,
        shareable: parsedInput.shareable,
      },
    });

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb: `edited the KPI "${parsedInput.name}"`,
      targetType: "Kpi",
      targetId: kpi.id,
    });

    revalidatePath("/kpis");
    return { name: parsedInput.name };
  });

/**
 * Publishes a draft, sends one back to draft, or retires it.
 *
 * Retiring is archiving rather than deleting: reviews have already been
 * scored against this KPI and those scores belong to people's records. An
 * archived KPI keeps its history but is left out of new review forms and of
 * the team's weight budget, so the freed weight can be given to something
 * that is actually scored.
 */
export const setKpiLifecycle = authActionClient
  .schema(setKpiLifecycleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod"]);

    const kpi = await prisma.kpi.findUnique({
      where: { id: parsedInput.kpiId },
      include: { kpiTeams: { select: { teamId: true, weightPct: true } } },
    });
    if (!kpi || kpi.orgId !== actor.orgId) throw new Error("KPI not found.");
    for (const kt of kpi.kpiTeams) await requireScopeAccess(actor, { teamId: kt.teamId });

    // Coming back out of the archive has to fit the budget again — the weight
    // it used to hold may since have been given to another KPI.
    if (kpi.lifecycle === "archived" && parsedInput.lifecycle !== "archived") {
      await prisma.$transaction(async (tx) => {
        for (const kt of kpi.kpiTeams) {
          await assertWeightBudget(tx, {
            teamId: kt.teamId,
            quarterId: kpi.quarterId,
            addWeight: kt.weightPct,
            excludeKpiId: kpi.id,
          });
        }
        await tx.kpi.update({ where: { id: kpi.id }, data: { lifecycle: parsedInput.lifecycle } });
      });
    } else {
      await prisma.kpi.update({ where: { id: kpi.id }, data: { lifecycle: parsedInput.lifecycle } });
    }

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb:
        parsedInput.lifecycle === "archived"
          ? `archived the KPI "${kpi.name}"`
          : parsedInput.lifecycle === "active"
            ? `published the KPI "${kpi.name}"`
            : `sent the KPI "${kpi.name}" back to draft`,
      targetType: "Kpi",
      targetId: kpi.id,
    });

    revalidatePath("/kpis");
    return { lifecycle: parsedInput.lifecycle, name: kpi.name };
  });
