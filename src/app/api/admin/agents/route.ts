import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [agents, a2aAgents] = await Promise.all([
    prisma.agent.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        avatarEmoji: true,
        personalityType: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.a2AAgent.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        avatarEmoji: true,
        personalityType: true,
        status: true,
        url: true,
        createdAt: true,
      },
    }),
  ]);

  const allAgents = [
    ...agents.map((a) => ({ ...a, type: "secondme" as const })),
    ...a2aAgents.map((a) => ({ ...a, type: "a2a" as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ agents: allAgents });
}
