import { LoginForm } from "@/components/auth/LoginForm";

const NOTICES: Record<string, string> = {
  no_profile: "That account is no longer part of this organization, so you've been signed out. Sign in with a different account, or ask an admin to invite you again.",
  invalid_link: "That invite link is invalid or has expired. Ask an admin to send a new one.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error: rawError } = await searchParams;
  const key = Array.isArray(rawError) ? rawError[0] : rawError;
  return <LoginForm notice={key ? NOTICES[key] : undefined} />;
}
