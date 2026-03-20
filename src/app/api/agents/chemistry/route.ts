import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { computeSmartCompatibility } from "@/lib/matchmaker";

/**
 * GET /api/agents/chemistry
 *
 * Returns a compatibility matrix for all online agents.
 * Each entry contains the pair's compatibility score (0-100)
 * and a brief reasoning string.
 *
 * Response shape:
 *   { matrix: Array<{ agentAId, agentBId, score, reasoning }>,
 *     agents: Array<{ id, name, avatarEmoji }> }
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const agents = await prisma.agent.findMany({
    where: { status: "online" },
    select: {
      id: true,
      name: true,
      avatarEmoji: true,
      personalityType: true,
      interests: true,
      catchphrase: true,
    },
    orderBy: { createdAt: "desc" },
    take: 30, // Cap to avoid O(n²) explosion
  });

  // Also fetch A2A agents
  const a2aAgents = await prisma.a2AAgent.findMany({
    where: { status: "online" },
    select: {
      id: true,
      name: true,
      avatarEmoji: true,
      personalityType: true,
      interests: true,
      catchphrase: true,
    },
    take: 20,
  });

  const allAgents = [...agents, ...a2aAgents].map((a) => ({
    id: a.id,
    name: a.name,
    interests: a.interests,
    personalityType: a.personalityType,
    catchphrase: a.catchphrase,
  }));

  // Compute all-pairs compatibility
  const matrix: Array<{
    agentAId: string;
    agentBId: string;
    score: number;
    reasoning: string;
  }> = [];

  for (let i = 0; i < allAgents.length; i++) {
    for (let j = i + 1; j < allAgents.length; j++) {
      const result = computeSmartCompatibility(allAgents[i], allAgents[j]);
      matrix.push({
        agentAId: allAgents[i].id,
        agentBId: allAgents[j].id,
        score: result.score,
        reasoning: result.reasoning,
      });
    }
  }

  const agentList = [...agents, ...a2aAgents].map((a) => ({
    id: a.id,
    name: a.name,
    avatarEmoji: a.avatarEmoji,
  }));

  return NextResponse.json({ matrix, agents: agentList });
}
