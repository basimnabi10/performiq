"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { submitMoodSchema } from "@/lib/validation/mood.schema";
import { weekLabel, weekStart } from "@/lib/weeks";

/**
 * One check-in per person per week, Monday to Sunday, locked once submitted.
 *
 * The row is stored against the week's Monday, so the existing unique index on
 * (memberId, date) is what enforces "once a week" — the rule lives in the
 * database rather than in whichever code path happens to write next.
 *
 * Locked means locked: this creates, and refuses to overwrite. A check-in is a
 * record of how the week felt at the time, and quietly editing last Tuesday's
 * answer on Friday would make the trend a record of nothing.
 */
export const submitMoodCheckin = authActionClient
  .schema(submitMoodSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    const date = weekStart();

    const existing = await prisma.moodCheckin.findUnique({
      where: { memberId_date: { memberId: actor.id, date } },
    });
    if (existing) {
      throw new Error(`You have already checked in for ${weekLabel()}. The next one opens on Monday.`);
    }

    await prisma.moodCheckin.create({
      data: { memberId: actor.id, date, value: parsedInput.value, reason: parsedInput.reason },
    });

    revalidatePath("/my-dashboard");
    revalidatePath("/hod-dashboard");
    return { weekLabel: weekLabel() };
  });
