"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { submitMoodSchema } from "@/lib/validation/mood.schema";

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** One check-in per member per day — upserts if they already checked in today. */
export const submitMoodCheckin = authActionClient
  .schema(submitMoodSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    const date = todayDateOnly();

    await prisma.moodCheckin.upsert({
      where: { memberId_date: { memberId: actor.id, date } },
      create: { memberId: actor.id, date, value: parsedInput.value, reason: parsedInput.reason },
      update: { value: parsedInput.value, reason: parsedInput.reason },
    });

    revalidatePath("/my-dashboard");
    revalidatePath("/hod-dashboard");
  });
