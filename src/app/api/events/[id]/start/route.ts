import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getEventViewById } from "@/lib/api-view";
import {
  createPairingsWithLLM,
  createRoundRobinPairings,
  pairKey,
  type AgentForMatching,
} from "@/lib/matchmaker";
import { persistRefreshedSession } from "@/lib/session-refresh";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "未登录，请先登录" },
      { status: 401 },
    );
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        pairings: {
          include: {
            dateSessions: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "活动不存在" },
        { status: 404 },
      );
    }

    // --- Phase: registration -> start round 1 ---
    if (event.phase === "registration") {
      return await startFirstRound(event, eventId, session);
    }

    // --- Phase: dating -> advance to next round or results ---
    if (event.phase === "dating") {
      return await advanceRound(event, eventId, session);
    }

    return NextResponse.json(
      { error: "活动已经开始或已结束，无法重复开始" },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === "PHASE_CONFLICT") {
      return NextResponse.json(
        { error: "活动状态已变更，请刷新后重试" },
        { status: 409 },
      );
    }
    console.error("Start event error:", err);
    return NextResponse.json(
      { error: "启动活动失败，请重试" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Collect all agents (SecondMe + A2A) for matching
// ---------------------------------------------------------------------------

async function collectAllAgentsForMatching(): Promise<AgentForMatching[]> {
  // Fetch SecondMe agents
  const agents = await prisma.agent.findMany({
    where: { status: "online" },
    orderBy: { createdAt: "asc" },
  });

  const agentsForMatching: AgentForMatching[] = agents.map((a) => ({
    id: a.id,
    name: a.name,
    interests: a.interests,
    personalityType: a.personalityType,
    catchphrase: a.catchphrase,
  }));

  // Fetch A2A agents
  const a2aAgents = await prisma.a2AAgent.findMany({
    where: { status: "online" },
    orderBy: { createdAt: "asc" },
  });

  for (const a2a of a2aAgents) {
    agentsForMatching.push({
      id: a2a.id,
      name: a2a.name,
      interests: a2a.interests, // Already stored as JSON string
      personalityType: a2a.personalityType,
      catchphrase: a2a.catchphrase,
    });
  }

  return agentsForMatching;
}

// ---------------------------------------------------------------------------
// Load agents from both tables by IDs (for subsequent rounds)
// ---------------------------------------------------------------------------

async function loadAgentsByIds(ids: string[]): Promise<AgentForMatching[]> {
  const agents = await prisma.agent.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: "asc" },
  });

  const a2aAgents = await prisma.a2AAgent.findMany({
    where: { id: { in: ids } },
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

// ---------------------------------------------------------------------------
// Start first round from registration phase
// ---------------------------------------------------------------------------

type EventWithPairings = {
  id: string;
  phase: string;
  currentRound: number;
  totalRounds: number;
  participantIds: string;
  pairings: Array<{
    agentAId: string;
    agentBId: string;
    dateSessions: Array<{ status: string }>;
  }>;
};

function parseParticipantIds(raw: string, pairings: EventWithPairings["pairings"]) {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const ids = parsed.filter((value): value is string => typeof value === "string");
      if (ids.length > 0) {
        return ids;
      }
    }
  } catch {
    // Fall through to pairings-based recovery.
  }

  return Array.from(
    new Set(pairings.flatMap((pairing) => [pairing.agentAId, pairing.agentBId])),
  );
}

async function startFirstRound(
  event: EventWithPairings,
  eventId: string,
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
) {
  const agentsForMatching = await collectAllAgentsForMatching();

  if (agentsForMatching.length < 2) {
    return NextResponse.json(
      { error: "至少需要2个智能体才能开始约会" },
      { status: 400 },
    );
  }

  const pairingResults = await createPairingsWithLLM(agentsForMatching);

  if (pairingResults.length === 0) {
    return NextResponse.json(
      { error: "配对失败，请确保有足够的智能体参与" },
      { status: 400 },
    );
  }

  const round = 1;
  const participantIds = agentsForMatching.map((agent) => agent.id);

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.event.findUnique({ where: { id: eventId } });
    if (!fresh || fresh.phase !== "registration") {
      throw new Error("PHASE_CONFLICT");
    }

    await tx.event.update({
      where: { id: eventId },
      data: {
        phase: "dating",
        currentRound: round,
        totalRounds: Math.max(event.totalRounds, 1),
        participantIds: JSON.stringify(participantIds),
      },
    });

    for (const pr of pairingResults) {
      const pairing = await tx.pairing.create({
        data: {
          eventId,
          agentAId: pr.agentAId,
          agentBId: pr.agentBId,
          compatibilityScore: pr.compatibilityScore,
          reasoning: pr.reasoning,
          round,
        },
      });

      await tx.dateSession.create({
        data: {
          pairingId: pairing.id,
          status: "pending",
          round,
        },
      });
    }
  });

  const updatedEvent = await getEventViewById(eventId);
  const response = NextResponse.json({ event: updatedEvent });
  await persistRefreshedSession(response, session);
  return response;
}

// ---------------------------------------------------------------------------
// Advance to next round (or finalize to results)
// ---------------------------------------------------------------------------

async function advanceRound(
  event: EventWithPairings,
  eventId: string,
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
) {
  const currentRound = event.currentRound;
  const totalRounds = event.totalRounds;

  // Get all date sessions for the current round
  const currentRoundSessions = await prisma.dateSession.findMany({
    where: {
      round: currentRound,
      pairing: { eventId },
    },
  });

  const allFinished = currentRoundSessions.length > 0 &&
    currentRoundSessions.every(
      (ds) => ds.status === "completed" || ds.status === "error" || ds.status === "failed" || ds.status === "cancelled",
    );

  if (!allFinished) {
    return NextResponse.json(
      { error: "当前轮次还有未完成的约会，请等待所有约会结束" },
      { status: 400 },
    );
  }

  // If we've completed all rounds, move to results
  if (currentRound >= totalRounds) {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.event.findUnique({ where: { id: eventId } });
      if (!fresh || fresh.phase !== "dating") {
        throw new Error("PHASE_CONFLICT");
      }
      await tx.event.update({
        where: { id: eventId },
        data: { phase: "results" },
      });
    });

    const updatedEvent = await getEventViewById(eventId);
    const response = NextResponse.json({ event: updatedEvent });
    await persistRefreshedSession(response, session);
    return response;
  }

  const nextRound = currentRound + 1;
  const participantIds = parseParticipantIds(event.participantIds, event.pairings);

  const agentsForMatching = await loadAgentsByIds(participantIds);

  if (agentsForMatching.length < 2) {
    return NextResponse.json(
      { error: "本次活动的参赛智能体不足，无法开始下一轮" },
      { status: 400 },
    );
  }

  const usedPairs = new Set<string>();
  for (const p of event.pairings) {
    usedPairs.add(pairKey(p.agentAId, p.agentBId));
  }

  const roundResults = createRoundRobinPairings(
    agentsForMatching,
    1,
    usedPairs,
  );

  const newPairings = roundResults[0] || [];

  if (newPairings.length === 0) {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.event.findUnique({ where: { id: eventId } });
      if (!fresh || fresh.phase !== "dating") {
        throw new Error("PHASE_CONFLICT");
      }
      await tx.event.update({
        where: { id: eventId },
        data: { phase: "results" },
      });
    });

    const updatedEvent = await getEventViewById(eventId);
    const response = NextResponse.json({ event: updatedEvent });
    await persistRefreshedSession(response, session);
    return response;
  }

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.event.findUnique({ where: { id: eventId } });
    if (!fresh || fresh.phase !== "dating" || fresh.currentRound !== currentRound) {
      throw new Error("PHASE_CONFLICT");
    }

    await tx.event.update({
      where: { id: eventId },
      data: { currentRound: nextRound },
    });

    for (const pr of newPairings) {
      const pairing = await tx.pairing.create({
        data: {
          eventId,
          agentAId: pr.agentAId,
          agentBId: pr.agentBId,
          compatibilityScore: pr.compatibilityScore,
          reasoning: pr.reasoning,
          round: nextRound,
        },
      });

      await tx.dateSession.create({
        data: {
          pairingId: pairing.id,
          status: "pending",
          round: nextRound,
        },
      });
    }
  });

  const updatedEvent = await getEventViewById(eventId);
  const response = NextResponse.json({ event: updatedEvent });
  await persistRefreshedSession(response, session);
  return response;
}
