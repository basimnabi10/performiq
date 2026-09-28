import { z } from "zod";

/** Kept small on purpose: an avatar is displayed at 56px at its largest. */
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export const uploadMyAvatarSchema = z.object({
  file: z
    .instanceof(File, { error: "Choose an image to upload." })
    .refine((f) => f.size > 0, { error: "That file is empty." })
    .refine((f) => f.size <= MAX_BYTES, { error: "Images must be 2MB or smaller." })
    .refine((f) => TYPES.includes(f.type), { error: "Use a PNG, JPEG, WEBP or GIF." }),
});

export const updateMyNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Enter your name." })
    .max(80, { error: "Keep it under 80 characters." }),
});

/** An organization's mark, uploaded by an admin. */
export const uploadOrgLogoSchema = z.object({
  file: z
    .instanceof(File, { error: "Choose an image to upload." })
    .refine((f) => f.size > 0, { error: "That file is empty." })
    .refine((f) => f.size <= MAX_BYTES, { error: "Images must be 2MB or smaller." })
    .refine((f) => [...TYPES, "image/svg+xml"].includes(f.type), {
      error: "Use a PNG, JPEG, WEBP, GIF or SVG.",
    }),
});
