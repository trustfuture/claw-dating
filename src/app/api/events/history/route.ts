import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "20")));

  // Aggregate stats across all events
  const events = await prisma.event.findMany({
    where: {
      phase: { in: ["results", "completed"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      phase: true,
      createdAt: true,
      pairings: {
        select: {
          agentAId: true,
          agentBId: true,
          compatibilityScore: true,
          dateSessions: {
            select: {
              status: true,
              ratings: {
                select: {
                  agentId: true,
                  score: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Per-agent stats across all events
  const agentStats: Record<string, {
    id: string;
    totalDates: number;
    totalEvents: number;
    ratingsGiven: number[];
    ratingsReceived: number[];
    compatScores: number[];
  }> = {};

  const eventSummaries = [];

  for (const event of events) {
    const agentIds = new Set<string>();
    let completedDates = 0;
    let totalDates = 0;

    for (const pairing of event.pairings) {
      agentIds.add(pairing.agentAId);
      agentIds.add(pairing.agentBId);

      for (const ds of pairing.dateSessions) {
        totalDates++;
        if (ds.status === "completed") completedDates++;

        if (ds.ratings.length < 2) continue;

        const ratingMap = new Map(ds.ratings.map((r) => [r.agentId, r.score]));

        for (const id of [pairing.agentAId, pairing.agentBId]) {
          if (!agentStats[id]) {
            agentStats[id] = { id, totalDates: 0, totalEvents: 0, ratingsGiven: [], ratingsReceived: [], compatScores: [] };
          }
          agentStats[id].totalDates++;
          if (pairing.compatibilityScore) {
            agentStats[id].compatScores.push(pairing.compatibilityScore);
          }
        }

        // A's rating = what A gave; B receives it
        const ratingA = ratingMap.get(pairing.agentAId);
        const ratingB = ratingMap.get(pairing.agentBId);

        if (ratingA !== undefined) {
          if (agentStats[pairing.agentAId]) agentStats[pairing.agentAId].ratingsGiven.push(ratingA);
          if (agentStats[pairing.agentBId]) agentStats[pairing.agentBId].ratingsReceived.push(ratingA);
        }
        if (ratingB !== undefined) {
          if (agentStats[pairing.agentBId]) agentStats[pairing.agentBId].ratingsGiven.push(ratingB);
          if (agentStats[pairing.agentAId]) agentStats[pairing.agentAId].ratingsReceived.push(ratingB);
        }
      }
    }

    // Count events per agent
    for (const id of agentIds) {
      if (agentStats[id]) agentStats[id].totalEvents++;
    }

    eventSummaries.push({
      id: event.id,
      name: event.name,
      phase: event.phase,
      createdAt: event.createdAt,
      participantCount: agentIds.size,
      totalDates,
      completedDates,
    });
  }

  // Resolve agent names from both tables
  const allAgentIds = Object.keys(agentStats);
  const [agents, a2aAgents] = await Promise.all([
    prisma.agent.findMany({
      where: { id: { in: allAgentIds } },
      select: { id: true, name: true, avatarEmoji: true },
    }),
    prisma.a2AAgent.findMany({
      where: { id: { in: allAgentIds } },
      select: { id: true, name: true, avatarEmoji: true },
    }),
  ]);

  const nameMap = new Map<string, { name: string; emoji: string }>();
  for (const a of [...agents, ...a2aAgents]) {
    nameMap.set(a.id, { name: a.name, emoji: a.avatarEmoji });
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : 0;

  const leaderboard = Object.values(agentStats)
    .map((s) => ({
      id: s.id,
      name: nameMap.get(s.id)?.name ?? "Unknown",
      avatarEmoji: nameMap.get(s.id)?.emoji ?? "🦞",
      totalDates: s.totalDates,
      totalEvents: s.totalEvents,
      avgRatingGiven: avg(s.ratingsGiven),
      avgRatingReceived: avg(s.ratingsReceived),
      avgCompatibility: avg(s.compatScores),
    }))
    .sort((a, b) => b.avgRatingReceived - a.avgRatingReceived);

  return NextResponse.json({
    totalEvents: events.length,
    events: eventSummaries,
    leaderboard,
  });
}
