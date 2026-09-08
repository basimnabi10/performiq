"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionClient } from "@/lib/safe-action";
import { checkRateLimit, loginRateLimit } from "@/lib/rateLimit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z.string().min(1, { error: "Password is required." }),
});

async function clientIp(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export const login = actionClient
  .schema(loginSchema)
  .action(async ({ parsedInput: { email, password } }) => {
    await checkRateLimit(loginRateLimit, `${await clientIp()}:${email}`);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Logged server-side only (visible in host runtime logs) -- the
      // user-facing message stays generic so we don't leak whether an
      // email exists or expose internal config errors to the client.
      console.error("Supabase sign-in error:", error.status, error.message);
      throw new Error("Incorrect email or password.");
    }
    redirect("/dashboard");
  });

export const logout = actionClient.action(async () => {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
});

const setPasswordSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your full name." }).max(80),
  password: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
    .regex(/[0-9]/, { error: "Include at least one number." }),
});

/** Completes signup after an invite/magic-link callback establishes a session. */
export const setPassword = actionClient
  .schema(setPasswordSchema)
  .action(async ({ parsedInput: { name, password } }) => {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw new Error("Your invite link has expired. Ask an admin to resend it.");
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      console.error("Supabase set-password error:", error.status, error.message);
      throw new Error("Couldn't set your password. Please try again.");
    }

    // A manual invite only knows an email address, so the member row is
    // created as "Pending (<email>)" — this is where the person replaces
    // that with their actual name and stops reading as pending everywhere.
    await prisma.member.updateMany({
      where: { OR: [{ authUserId: data.user.id }, { email: data.user.email ?? "" }] },
      data: { name, status: "active", authUserId: data.user.id },
    });

    redirect("/dashboard");
  });

const completeProfileSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your full name." }).max(80),
});

/**
 * Replaces the "Pending (<email>)" placeholder a manual invite creates.
 * Needed for anyone who accepted before the set-password step asked for a
 * name — without it they read as pending everywhere forever.
 */
export const completeProfile = actionClient
  .schema(completeProfileSchema)
  .action(async ({ parsedInput: { name } }) => {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("You're not signed in.");

    await prisma.member.updateMany({
      where: { authUserId: data.user.id },
      data: { name, status: "active" },
    });

    redirect("/dashboard");
  });
