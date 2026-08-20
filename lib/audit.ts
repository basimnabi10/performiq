import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Fire-and-forget activity log write. Never throws into the caller's
 * transaction/action — an audit-log failure should never block the real
 * operation it's describing.
 */
export async function logActivity(args: {
  orgId: string;
  actorId: string;
  verb: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        orgId: args.orgId,
        actorId: args.actorId,
        verb: args.verb,
        targetType: args.targetType,
        targetId: args.targetId,
        metadata: args.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
}
