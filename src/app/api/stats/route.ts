import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Cache for 60 seconds

/**
 * Public platform stats — no auth required.
 * Used on the landing page to show activity.
 */
export async function GET() {
  try {
    const [agentCount, a2aCount, eventCount, dateCount, completedDateCount, messageCount] =
      await Promise.all([
        prisma.agent.count(),
        prisma.a2AAgent.count(),
        prisma.event.count(),
        prisma.dateSession.count(),
        prisma.dateSession.count({ where: { status: "completed" } }),
        prisma.message.count(),
      ]);

    return NextResponse.json({
      totalAgents: agentCount + a2aCount,
      totalEvents: eventCount,
      totalDates: dateCount,
      completedDates: completedDateCount,
      totalMessages: messageCount,
    });
  } catch (err) {
    logger.error("Stats error", {
      route: "/api/stats",
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { totalAgents: 0, totalEvents: 0, totalDates: 0, completedDates: 0, totalMessages: 0 },
    );
  }
}
