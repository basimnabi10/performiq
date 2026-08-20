import "server-only";

import { cache } from "react";
import type { AuthRole, Member } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Central authorization boundary for the app. Prisma connects via a direct
 * Postgres role and bypasses Supabase RLS, so every Server Action and every
 * gated page MUST go through the helpers below rather than re-implementing
 * a role/ownership check inline. RLS is enabled separately as defense in
 * depth (see supabase/sql/002_defense_in_depth_rls.sql), not as the primary
 * control.
 */

export class AuthzError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" = "FORBIDDEN",
  ) {
    super(message);
    this.name = "AuthzError";
  }
}

/**
 * Resolves the current request's Member row from the Supabase session.
 * Cached per-request (React `cache`) so repeated calls in one render/action
 * don't re-hit the DB. Throws AuthzError if there's no session or no linked
 * Member (e.g. an invited-but-not-yet-activated auth user).
 */
export const getCurrentMember = cache(async (): Promise<Member> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new AuthzError("Not signed in.", "UNAUTHENTICATED");
  }

  const member = await prisma.member.findUnique({
    where: { authUserId: data.user.id },
  });

  if (!member) {
    throw new AuthzError("No PerformIQ profile is linked to this account yet.", "UNAUTHENTICATED");
  }

  return member;
});

/** Throws unless the member's authRole is one of `allowed`. */
export function requireRole(member: Member, allowed: AuthRole[]): void {
  if (!allowed.includes(member.authRole)) {
    throw new AuthzError(`This action requires one of: ${allowed.join(", ")}.`);
  }
}

/**
 * Throws unless `member` IS the target member, OR holds one of `allowed`
 * roles AND is scoped over the target (same department for hod/admin is
 * assumed org-wide for admin; hod/manager are checked against the target's
 * department/team).
 */
export async function requireSelfOrRole(
  member: Member,
  targetMemberId: string,
  allowed: AuthRole[],
): Promise<void> {
  if (member.id === targetMemberId) return;

  if (!allowed.includes(member.authRole)) {
    throw new AuthzError("You don't have access to this member's data.");
  }

  if (member.authRole === "admin") return;

  const target = await prisma.member.findUnique({
    where: { id: targetMemberId },
    select: { departmentId: true, teamId: true },
  });

  if (!target) {
    throw new AuthzError("Member not found.");
  }

  if (member.authRole === "hod") {
    if (!member.departmentId || member.departmentId !== target.departmentId) {
      throw new AuthzError("This member is outside your department.");
    }
    return;
  }

  if (member.authRole === "manager") {
    if (!member.teamId || member.teamId !== target.teamId) {
      throw new AuthzError("This member is outside your team.");
    }
    return;
  }

  throw new AuthzError("You don't have access to this member's data.");
}

/**
 * Throws unless `member` is an admin, or an hod/manager whose own
 * department/team matches the requested scope. Used to gate scope-filtered
 * reads (HOD Dashboard, Analytics) and scoped writes (invite into a team,
 * create a team-scoped KPI).
 */
export async function requireScopeAccess(
  member: Member,
  scope: { teamId?: string | null; departmentId?: string | null },
): Promise<void> {
  if (member.authRole === "admin") return;

  // Branch on the ACTOR's role first, not on which scope fields happen to be
  // set — a caller may legitimately pass both teamId and departmentId (e.g.
  // "this member's team + department"), and a manager's team-level access
  // must still be checked even when a departmentId is also present.
  if (member.authRole === "hod") {
    const departmentId =
      scope.departmentId ??
      (scope.teamId
        ? (await prisma.team.findUnique({ where: { id: scope.teamId }, select: { departmentId: true } }))
            ?.departmentId
        : undefined);
    if (!departmentId || member.departmentId !== departmentId) {
      throw new AuthzError("This is outside your department.");
    }
    return;
  }

  if (member.authRole === "manager") {
    if (scope.teamId && member.teamId === scope.teamId) return;
    throw new AuthzError("This is outside your team.");
  }

  throw new AuthzError("You don't have access to this scope.");
}

/**
 * Course authoring rights: admin/hod/manager always have them; an `ic` only
 * gains them after an HOD explicitly approves their "teach a lesson"
 * request (LessonRequest.status === "approved").
 */
export async function requireCanAuthorCourses(member: Member): Promise<void> {
  if (member.authRole !== "ic") return;

  const approved = await prisma.lessonRequest.findFirst({
    where: { memberId: member.id, status: "approved" },
  });
  if (!approved) {
    throw new AuthzError("Ask your HOD to approve a lesson request before authoring courses.");
  }
}
