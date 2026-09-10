import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

/**
 * Where a reset email lands after /accept has established the recovery
 * session. Distinct from /set-password, which also collects a name for
 * first-time invitees.
 */
export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
