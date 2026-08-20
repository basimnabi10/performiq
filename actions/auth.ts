"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionClient } from "@/lib/safe-action";
import { checkRateLimit, loginRateLimit } from "@/lib/rateLimit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  password: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
    .regex(/[0-9]/, { error: "Include at least one number." }),
});

/** Completes signup after an invite/magic-link callback establishes a session. */
export const setPassword = actionClient
  .schema(setPasswordSchema)
  .action(async ({ parsedInput: { password } }) => {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw new Error("Your invite link has expired. Ask an admin to resend it.");
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw new Error("Couldn't set your password. Please try again.");
    }
    redirect("/dashboard");
  });
