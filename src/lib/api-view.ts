import { prisma } from "@/lib/db";

type AgentRecord = {
  id: string;
  name: string;
  avatarEmoji: string;
  personalityType: string;
  interests: string;
  catchphrase: string;
  status: string;
  user?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
};

type AuthUserRecord = {
  id: string;
  secondmeUserId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  route: string | null;
  createdAt: Date;
  updatedAt: Date;
  agents: AgentRecord[];
};

type EventAgentRecord = {
  id: string;
  name: string;
  avatarEmoji: string;
  personalityType: string;
};

type EventRecord = {
  id: string;
  name: string;
  phase: string;
  currentRound: number;
  totalRounds: number;
  createdAt: Date;
  pairings: Array<{
    id: string;
    eventId: string;
    agentAId: string;
    agentBId: string;
    compatibilityScore: number | null;
    reasoning: string | null;
    round: number;
    dateSessions: Array<{
      id: string;
      status: string;
      round: number;
      chatSessionId: string | null;
      createdAt: Date;
      messages: Array<{
        id: string;
        senderId: string;
        senderName: string;
        content: string;
        turn: number;
        createdAt: Date;
      }>;
      ratings: Array<{
        id: string;
        agentId: string;
        agentName: string;
        score: number;
        comment: string | null;
      }>;
    }>;
  }>;
};

function byRoundThenCreatedAt(
  a: { round: number; createdAt: Date },
  b: { round: number; createdAt: Date },
) {
  if (a.round !== b.round) {
    return a.round - b.round;
  }
  return a.createdAt.getTime() - b.createdAt.getTime();
}

export function parseJsonStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function serializeAgent(agent: AgentRecord) {
  return {
    id: agent.id,
    name: agent.name,
    avatarEmoji: agent.avatarEmoji,
    personalityType: agent.personalityType,
    interests: parseJsonStringArray(agent.interests),
    catchphrase: agent.catchphrase,
    status: agent.status,
    ...(agent.user
      ? {
          user: {
            id: agent.user.id,
            name: agent.user.name,
            avatarUrl: agent.user.avatarUrl ?? "",
          },
        }
      : {}),
  };
}

export function serializeAuthPayload(user: AuthUserRecord) {
  return {
    user: {
      id: user.id,
      secondmeUserId: user.secondmeUserId,
      name: user.name,
      email: user.email ?? "",
      avatarUrl: user.avatarUrl ?? "",
      route: user.route ?? "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    agent: user.agents[0] ? serializeAgent(user.agents[0]) : null,
  };
}

function resolveEventAgent(
  agentMap: Map<string, EventAgentRecord>,
  agentId: string,
) {
  const agent = agentMap.get(agentId);

  return {
    id: agentId,
    name: agent?.name ?? "神秘嘉宾",
    avatarEmoji: agent?.avatarEmoji ?? "🦞",
    personalityType: agent?.personalityType ?? "",
  };
}

function serializeRatings(
  ratings: EventRecord["pairings"][number]["dateSessions"][number]["ratings"],
  pairing: EventRecord["pairings"][number],
) {
  const orderedIds = [pairing.agentAId, pairing.agentBId];
  const ratingMap = new Map(ratings.map((rating) => [rating.agentId, rating]));

  const orderedRatings = orderedIds
    .map((agentId) => ratingMap.get(agentId))
    .filter(
      (
        rating,
      ): rating is EventRecord["pairings"][number]["dateSessions"][number]["ratings"][number] =>
        Boolean(rating),
    )
    .map((rating) => ({
      agentId: rating.agentId,
      agentName: rating.agentName,
      score: rating.score,
      comment: rating.comment ?? "",
    }));

  const extraRatings = ratings
    .filter((rating) => !orderedIds.includes(rating.agentId))
    .map((rating) => ({
      agentId: rating.agentId,
      agentName: rating.agentName,
      score: rating.score,
      comment: rating.comment ?? "",
    }));

  return [...orderedRatings, ...extraRatings];
}

function serializeDateSession(
  dateSession: EventRecord["pairings"][number]["dateSessions"][number],
  pairing: EventRecord["pairings"][number],
  agentMap: Map<string, EventAgentRecord>,
) {
  return {
    id: dateSession.id,
    status: dateSession.status,
    round: dateSession.round,
    createdAt: dateSession.createdAt,
    pairing: {
      id: pairing.id,
      compatibilityScore: pairing.compatibilityScore ?? 0,
      reasoning: pairing.reasoning ?? "",
      round: pairing.round,
      agentA: resolveEventAgent(agentMap, pairing.agentAId),
      agentB: resolveEventAgent(agentMap, pairing.agentBId),
    },
    messages: dateSession.messages.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      content: message.content,
      turn: message.turn,
      createdAt: message.createdAt,
    })),
    ratings: serializeRatings(dateSession.ratings, pairing),
  };
}

async function loadEventAgents(pairings: EventRecord["pairings"]) {
  const agentIds = Array.from(
    new Set(pairings.flatMap((pairing) => [pairing.agentAId, pairing.agentBId])),
  );

  if (agentIds.length === 0) {
    return new Map<string, EventAgentRecord>();
  }

  const agents = await prisma.agent.findMany({
    where: { id: { in: agentIds } },
    select: {
      id: true,
      name: true,
      avatarEmoji: true,
      personalityType: true,
    },
  });

  return new Map(agents.map((agent) => [agent.id, agent]));
}

type AgentStatsEntry = {
  id: string;
  name: string;
  avatarEmoji: string;
  personalityType: string;
  totalDates: number;
  avgRatingGiven: number;
  avgRatingReceived: number;
  highestCompatibility: number;
  highestSingleRating: number;
  ratingsPerRound: Record<number, { given: number; received: number; count: number }>;
};

function computeAgentStats(
  pairings: EventRecord["pairings"],
  agentMap: Map<string, EventAgentRecord>,
): AgentStatsEntry[] {
  const statsMap = new Map<string, {
    totalDates: number;
    ratingsGivenTotal: number;
    ratingsGivenCount: number;
    ratingsReceivedTotal: number;
    ratingsReceivedCount: number;
    highestCompatibility: number;
    highestSingleRating: number;
    ratingsPerRound: Record<number, { given: number; received: number; count: number }>;
  }>();

  function ensureAgent(agentId: string) {
    if (!statsMap.has(agentId)) {
      statsMap.set(agentId, {
        totalDates: 0,
        ratingsGivenTotal: 0,
        ratingsGivenCount: 0,
        ratingsReceivedTotal: 0,
        ratingsReceivedCount: 0,
        highestCompatibility: 0,
        highestSingleRating: 0,
        ratingsPerRound: {},
      });
    }
    return statsMap.get(agentId)!;
  }

  for (const pairing of pairings) {
    const compat = pairing.compatibilityScore ?? 0;
    const statsA = ensureAgent(pairing.agentAId);
    const statsB = ensureAgent(pairing.agentBId);

    if (compat > statsA.highestCompatibility) statsA.highestCompatibility = compat;
    if (compat > statsB.highestCompatibility) statsB.highestCompatibility = compat;

    for (const dateSession of pairing.dateSessions) {
      if (dateSession.ratings.length < 2) continue;

      statsA.totalDates++;
      statsB.totalDates++;

      const ratingByAgent = new Map(dateSession.ratings.map((r) => [r.agentId, r]));
      const ratingA = ratingByAgent.get(pairing.agentAId);
      const ratingB = ratingByAgent.get(pairing.agentBId);

      // A gives rating -> B receives it; B gives rating -> A receives it
      if (ratingA) {
        statsA.ratingsGivenTotal += ratingA.score;
        statsA.ratingsGivenCount++;
        statsB.ratingsReceivedTotal += ratingA.score;
        statsB.ratingsReceivedCount++;
        if (ratingA.score > statsB.highestSingleRating) {
          statsB.highestSingleRating = ratingA.score;
        }

        // Per-round stats for B (received) and A (given)
        const round = dateSession.round;
        if (!statsA.ratingsPerRound[round]) statsA.ratingsPerRound[round] = { given: 0, received: 0, count: 0 };
        statsA.ratingsPerRound[round].given += ratingA.score;
        statsA.ratingsPerRound[round].count++;

        if (!statsB.ratingsPerRound[round]) statsB.ratingsPerRound[round] = { given: 0, received: 0, count: 0 };
        statsB.ratingsPerRound[round].received += ratingA.score;
      }

      if (ratingB) {
        statsB.ratingsGivenTotal += ratingB.score;
        statsB.ratingsGivenCount++;
        statsA.ratingsReceivedTotal += ratingB.score;
        statsA.ratingsReceivedCount++;
        if (ratingB.score > statsA.highestSingleRating) {
          statsA.highestSingleRating = ratingB.score;
        }

        const round = dateSession.round;
        if (!statsB.ratingsPerRound[round]) statsB.ratingsPerRound[round] = { given: 0, received: 0, count: 0 };
        statsB.ratingsPerRound[round].given += ratingB.score;
        statsB.ratingsPerRound[round].count++;

        if (!statsA.ratingsPerRound[round]) statsA.ratingsPerRound[round] = { given: 0, received: 0, count: 0 };
        statsA.ratingsPerRound[round].received += ratingB.score;
      }
    }
  }

  const result: AgentStatsEntry[] = [];
  for (const [agentId, stats] of statsMap) {
    const agent = agentMap.get(agentId);
    result.push({
      id: agentId,
      name: agent?.name ?? "神秘嘉宾",
      avatarEmoji: agent?.avatarEmoji ?? "🦞",
      personalityType: agent?.personalityType ?? "",
      totalDates: stats.totalDates,
      avgRatingGiven: stats.ratingsGivenCount > 0
        ? Math.round((stats.ratingsGivenTotal / stats.ratingsGivenCount) * 10) / 10
        : 0,
      avgRatingReceived: stats.ratingsReceivedCount > 0
        ? Math.round((stats.ratingsReceivedTotal / stats.ratingsReceivedCount) * 10) / 10
        : 0,
      highestCompatibility: Math.round((stats.highestCompatibility) * 10) / 10,
      highestSingleRating: stats.highestSingleRating,
      ratingsPerRound: stats.ratingsPerRound,
    });
  }

  return result.sort((a, b) => b.avgRatingReceived - a.avgRatingReceived);
}

async function serializeEvent(event: EventRecord) {
  const pairings = [...event.pairings].sort((a, b) => a.round - b.round);
  const agentMap = await loadEventAgents(pairings);

  const serializedPairings = pairings.map((pairing) => {
    const dateSessions = [...pairing.dateSessions]
      .sort(byRoundThenCreatedAt)
      .map((dateSession) => serializeDateSession(dateSession, pairing, agentMap));

    return {
      id: pairing.id,
      round: pairing.round,
      compatibilityScore: pairing.compatibilityScore ?? 0,
      reasoning: pairing.reasoning ?? "",
      agentA: resolveEventAgent(agentMap, pairing.agentAId),
      agentB: resolveEventAgent(agentMap, pairing.agentBId),
      dateSessions,
    };
  });

  const agentStats = computeAgentStats(pairings, agentMap);

  return {
    id: event.id,
    name: event.name,
    phase: event.phase,
    currentRound: event.currentRound,
    totalRounds: event.totalRounds,
    createdAt: event.createdAt,
    pairings: serializedPairings,
    dates: serializedPairings.flatMap((pairing) => pairing.dateSessions),
    agentStats,
  };
}

async function queryEventById(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      pairings: {
        include: {
          dateSessions: {
            include: {
              messages: {
                orderBy: { turn: "asc" },
              },
              ratings: true,
            },
          },
        },
      },
    },
  });
}

async function queryLatestEvent() {
  return prisma.event.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      pairings: {
        include: {
          dateSessions: {
            include: {
              messages: {
                orderBy: { turn: "asc" },
              },
              ratings: true,
            },
          },
        },
      },
    },
  });
}

export async function getEventViewById(id: string) {
  const event = await queryEventById(id);
  if (!event) return null;
  return serializeEvent(event as EventRecord);
}

export async function getLatestEventView() {
  const event = await queryLatestEvent();
  if (!event) return null;
  return serializeEvent(event as EventRecord);
}

export async function getAllEventSummaries() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      pairings: {
        include: {
          dateSessions: {
            include: {
              ratings: true,
            },
          },
        },
      },
    },
  });

  return events.map((event) => {
    const dateCount = event.pairings.reduce(
      (sum, p) => sum + p.dateSessions.length,
      0,
    );

    const agentIds = new Set(
      event.pairings.flatMap((p) => [p.agentAId, p.agentBId]),
    );

    return {
      id: event.id,
      name: event.name,
      phase: event.phase,
      currentRound: event.currentRound,
      totalRounds: event.totalRounds,
      createdAt: event.createdAt,
      participantCount: agentIds.size,
      dateCount,
    };
  });
}
