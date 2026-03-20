import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createPairingsWithLLM,
  type AgentForMatching,
} from "@/lib/matchmaker";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/daily-event
 *
 * Vercel Cron handler — creates a daily dating event and runs matchmaking.
 * Does NOT run the actual dates (those are triggered by clients or a separate cron).
 *
 * Security: Vercel automatically sends CRON_SECRET in the Authorization header.
 * Kill switch: Set ENABLE_DAILY_EVENT=false to disable.
 *
 * Flow:
 *  1. Verify CRON_SECRET
 *  2. Check kill switch
 *  3. Idempotency: skip if today's event already exists
 *  4. Check for active (unfinished) events
 *  5. Collect online agents (need ≥2)
 *  6. Create event + run matchmaking + create pairings + pending date sessions
 *  7. Return summary
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // --- Auth: Verify Vercel CRON_SECRET ---
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Cron auth failed", { route: "cron/daily-event" });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // --- Kill switch ---
  if (process.env.ENABLE_DAILY_EVENT === "false") {
    logger.info("Daily event disabled via ENABLE_DAILY_EVENT", { route: "cron/daily-event" });
    return NextResponse.json({ skipped: true, reason: "disabled" });
  }

  try {
    // --- Idempotency: check if today's event already exists ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingToday = await prisma.event.findFirst({
      where: {
        name: { startsWith: "每日相亲" },
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    });

    if (existingToday) {
      logger.info("Daily event already exists for today", {
        route: "cron/daily-event",
        eventId: existingToday.id,
      });
      return NextResponse.json({
        skipped: true,
        reason: "already_exists",
        eventId: existingToday.id,
      });
    }

    // --- Check for active events ---
    const activeEvent = await prisma.event.findFirst({
      where: {
        phase: { notIn: ["completed", "results"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (activeEvent) {
      logger.info("Skipping daily event: active event in progress", {
        route: "cron/daily-event",
        activeEventId: activeEvent.id,
        phase: activeEvent.phase,
      });
      return NextResponse.json({
        skipped: true,
        reason: "active_event",
        activeEventId: activeEvent.id,
      });
    }

    // --- Collect online agents ---
    const agents = await collectOnlineAgents();

    if (agents.length < 2) {
      logger.info("Skipping daily event: insufficient agents", {
        route: "cron/daily-event",
        agentCount: agents.length,
      });
      return NextResponse.json({
        skipped: true,
        reason: "insufficient_agents",
        agentCount: agents.length,
      });
    }

    // --- Create event ---
    const dateStr = new Date().toLocaleDateString("zh-CN", {
      month: "long",
      day: "numeric",
    });
    const eventName = `每日相亲 ${dateStr}`;

    const event = await prisma.event.create({
      data: {
        name: eventName,
        phase: "registration",
        currentRound: 0,
        totalRounds: 1,
        turnsPerAgent: 5,
      },
    });

    // --- Run matchmaking ---
    const pairingResults = await createPairingsWithLLM(agents);

    if (pairingResults.length === 0) {
      logger.warn("Daily event matchmaking produced no pairs", {
        route: "cron/daily-event",
        eventId: event.id,
        agentCount: agents.length,
      });
      // Clean up the empty event
      await prisma.event.delete({ where: { id: event.id } });
      return NextResponse.json({
        skipped: true,
        reason: "no_pairs",
        agentCount: agents.length,
      });
    }

    // --- Create pairings and date sessions ---
    const participantIds = agents.map((a) => a.id);

    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: event.id },
        data: {
          phase: "dating",
          currentRound: 1,
          participantIds: JSON.stringify(participantIds),
        },
      });

      for (const pr of pairingResults) {
        const pairing = await tx.pairing.create({
          data: {
            eventId: event.id,
            agentAId: pr.agentAId,
            agentBId: pr.agentBId,
            compatibilityScore: pr.compatibilityScore,
            reasoning: pr.reasoning,
            round: 1,
          },
        });

        await tx.dateSession.create({
          data: {
            pairingId: pairing.id,
            status: "pending",
            round: 1,
          },
        });
      }
    });

    const durationMs = Date.now() - startTime;

    logger.info("Daily event created successfully", {
      route: "cron/daily-event",
      eventId: event.id,
      eventName,
      agentCount: agents.length,
      pairCount: pairingResults.length,
      durationMs,
    });

    return NextResponse.json({
      created: true,
      eventId: event.id,
      eventName,
      agentCount: agents.length,
      pairCount: pairingResults.length,
      durationMs,
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logger.error("Daily event cron failed", {
      route: "cron/daily-event",
      error: err instanceof Error ? err.message : String(err),
      durationMs,
    });
    return NextResponse.json(
      { error: "Daily event creation failed" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function collectOnlineAgents(): Promise<AgentForMatching[]> {
  const agents = await prisma.agent.findMany({
    where: { status: "online" },
    orderBy: { createdAt: "asc" },
  });

  const a2aAgents = await prisma.a2AAgent.findMany({
    where: { status: "online" },
    orderBy: { createdAt: "asc" },
  });

  return [
    ...agents.map((a) => ({
      id: a.id,
      name: a.name,
      interests: a.interests,
      personalityType: a.personalityType,
      catchphrase: a.catchphrase,
    })),
    ...a2aAgents.map((a) => ({
      id: a.id,
      name: a.name,
      interests: a.interests,
      personalityType: a.personalityType,
      catchphrase: a.catchphrase,
    })),
  ];
}
