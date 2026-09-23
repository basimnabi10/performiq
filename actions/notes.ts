"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { AuthzError, requireRole, requireScopeAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { addCoachingNoteSchema, deleteCoachingNoteSchema } from "@/lib/validation/notes.schema";

/**
 * Coaching notes: written context about a person, kept beside their reviews
 * and deliberately outside them.
 *
 * A review is the scored record that leaves the team -- it goes to HR and
 * feeds the numbers people are compared on. A note is the conversation around
 * it. Keeping them apart is the whole point of this feature, so notes are
 * never included in an export, and nothing here writes to a Review.
 */
export const addCoachingNote = authActionClient
  .schema(addCoachingNoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin", "hod", "manager"]);

    const member = await prisma.member.findUnique({ where: { id: parsedInput.memberId } });
    if (!member || member.orgId !== actor.orgId) throw new Error("Member not found.");
    await requireScopeAccess(actor, { teamId: member.teamId, departmentId: member.departmentId });

    const note = await prisma.coachingNote.create({
      data: {
        orgId: actor.orgId,
        memberId: member.id,
        authorId: actor.id,
        body: parsedInput.body.trim(),
      },
    });

    revalidatePath(`/members/${member.id}`);
    return { noteId: note.id };
  });

/**
 * Only the author or an admin can remove a note.
 *
 * A manager deleting another manager's note about the same person would erase
 * part of that person's record without leaving a trace of who did it, so the
 * narrower rule is the right one even though it means asking an admin
 * occasionally.
 */
export const deleteCoachingNote = authActionClient
  .schema(deleteCoachingNoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;

    const note = await prisma.coachingNote.findUnique({ where: { id: parsedInput.noteId } });
    if (!note || note.orgId !== actor.orgId) throw new Error("Note not found.");

    if (note.authorId !== actor.id && actor.authRole !== "admin") {
      throw new AuthzError("Only the person who wrote a note, or an admin, can delete it.");
    }

    await prisma.coachingNote.delete({ where: { id: note.id } });
    revalidatePath(`/members/${note.memberId}`);
  });
