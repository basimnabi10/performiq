import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { closeElapsedCycles, openCurrentCycles } from "@/lib/cycle-open";

/**
 * Opens the current month's review cycle for every scope that needs one.
 *
 * Runs daily (see vercel.json) rather than only on the 1st: a single
 * monthly trigger that fails leaves the whole company with no cycle until
 * someone notices, whereas openCurrentCycles is idempotent, so running it
 * every day costs one cheap query and self-heals a missed run.
 *
 * Authorization: Vercel Cron sends a bearer token matching CRON_SECRET. A
 * request without it is refused -- this endpoint writes data, so it must not
 * be callable by anyone who guesses the URL.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not set; refusing to run the cycle opener.");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const organizations = await prisma.organization.findMany({ select: { id: true } });
  const results = [];
  for (const org of organizations) {
    try {
      // Close first, so a month that has just ended is not briefly
      // recorded as running alongside the one replacing it.
      const closed = await closeElapsedCycles(org.id);
      const opened = await openCurrentCycles(org.id);
      results.push({ orgId: org.id, ...opened, closed: closed.closed, quartersClosed: closed.quartersClosed });
    } catch (e) {
      // One organization failing must not stop the rest from getting their
      // month opened.
      console.error("Cycle opener failed for org", org.id, e);
      results.push({ orgId: org.id, error: e instanceof Error ? e.message : "unknown" });
    }
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), results });
}
