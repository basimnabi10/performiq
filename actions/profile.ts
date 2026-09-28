"use server";

import { revalidatePath } from "next/cache";
import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { logActivity } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateMyNameSchema, uploadMyAvatarSchema, uploadOrgLogoSchema } from "@/lib/validation/profile.schema";

const BUCKET = "avatars";

/**
 * Makes sure the bucket exists before the first upload.
 *
 * Doing it here rather than as a setup step means a new environment needs no
 * manual dashboard work to have working avatars — and it is safe to call
 * repeatedly, since an existing bucket comes back as an error we ignore
 * rather than a failure worth surfacing.
 */
async function ensureBucket(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const { data } = await admin.storage.getBucket(BUCKET);
  if (data) return;
  await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  });
}

/**
 * Replaces the signed-in person's own photo.
 *
 * The member is taken from the session and never from the request, so this
 * cannot be pointed at somebody else's row — there is no id to tamper with.
 * Nobody sets another person's picture, including admins.
 */
export const uploadMyAvatar = authActionClient
  .schema(uploadMyAvatarSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    const file = parsedInput.file;

    const admin = createSupabaseAdminClient();
    await ensureBucket(admin);

    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : "jpg";
    // The timestamp is what makes a new photo actually appear: the old URL
    // sits in browser and CDN caches, so overwriting the same path would
    // leave people looking at the previous picture for as long as it lives
    // there.
    const path = `${actor.id}/${Date.now()}.${extension}`;

    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });

    if (error) throw new Error(`Couldn't upload that image: ${error.message}`);

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);

    const previous = actor.avatarUrl;
    await prisma.member.update({ where: { id: actor.id }, data: { avatarUrl: data.publicUrl } });

    // Tidy the one it replaced, so a person changing their photo often does
    // not leave a trail of dead files behind them. A failure here is not
    // worth failing the upload over.
    if (previous?.includes(`/${BUCKET}/`)) {
      const oldPath = previous.split(`/${BUCKET}/`)[1];
      if (oldPath) await admin.storage.from(BUCKET).remove([oldPath]).catch(() => {});
    }

    revalidatePath("/settings");
    revalidatePath("/members");
    revalidatePath(`/members/${actor.id}`);
    return { avatarUrl: data.publicUrl };
  });

/** Clears your photo, falling back to the initials avatar. */
export const removeMyAvatar = authActionClient.action(async ({ ctx }) => {
  const actor = ctx.member;

  if (actor.avatarUrl?.includes(`/${BUCKET}/`)) {
    const path = actor.avatarUrl.split(`/${BUCKET}/`)[1];
    if (path) await createSupabaseAdminClient().storage.from(BUCKET).remove([path]).catch(() => {});
  }

  await prisma.member.update({ where: { id: actor.id }, data: { avatarUrl: null } });
  revalidatePath("/settings");
  revalidatePath("/members");
  return { removed: true };
});

/** Your own display name, as it appears to everyone else. */
export const updateMyName = authActionClient
  .schema(updateMyNameSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    await prisma.member.update({ where: { id: actor.id }, data: { name: parsedInput.name } });
    revalidatePath("/settings");
    revalidatePath("/members");
    return { name: parsedInput.name };
  });

/**
 * The organization's mark, shown in the sidebar in place of the default.
 *
 * Admin-only: this is the one image in the app that everybody sees, so it is
 * not something any member can change. It shares the avatars bucket under an
 * `org/` prefix rather than needing a second one.
 */
export const uploadOrgLogo = authActionClient
  .schema(uploadOrgLogoSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = ctx.member;
    requireRole(actor, ["admin"]);

    const file = parsedInput.file;
    const admin = createSupabaseAdminClient();
    await ensureBucket(admin);

    const extension =
      file.type === "image/svg+xml"
        ? "svg"
        : file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : file.type === "image/gif"
              ? "gif"
              : "jpg";
    const path = `org/${actor.orgId}/${Date.now()}.${extension}`;

    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });
    if (error) throw new Error(`Couldn't upload that image: ${error.message}`);

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: actor.orgId },
      select: { logoUrl: true },
    });
    await prisma.organization.update({ where: { id: actor.orgId }, data: { logoUrl: data.publicUrl } });

    if (org.logoUrl?.includes(`/${BUCKET}/`)) {
      const old = org.logoUrl.split(`/${BUCKET}/`)[1];
      if (old) await admin.storage.from(BUCKET).remove([old]).catch(() => {});
    }

    await logActivity({
      orgId: actor.orgId,
      actorId: actor.id,
      verb: "changed the organization logo",
      targetType: "Organization",
      targetId: actor.orgId,
    });

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { logoUrl: data.publicUrl };
  });

/** Puts the default mark back. */
export const removeOrgLogo = authActionClient.action(async ({ ctx }) => {
  const actor = ctx.member;
  requireRole(actor, ["admin"]);

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: actor.orgId },
    select: { logoUrl: true },
  });
  if (org.logoUrl?.includes(`/${BUCKET}/`)) {
    const path = org.logoUrl.split(`/${BUCKET}/`)[1];
    if (path) await createSupabaseAdminClient().storage.from(BUCKET).remove([path]).catch(() => {});
  }

  await prisma.organization.update({ where: { id: actor.orgId }, data: { logoUrl: null } });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { removed: true };
});
