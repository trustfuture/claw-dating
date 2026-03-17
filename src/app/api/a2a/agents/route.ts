import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJsonStringArray } from "@/lib/api-view";

export async function GET() {
  try {
    const agents = await prisma.a2AAgent.findMany({
      where: { status: "online" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      agents: agents.map((agent) => ({
        id: agent.id,
        url: agent.url,
        name: agent.name,
        avatarEmoji: agent.avatarEmoji,
        personalityType: agent.personalityType,
        interests: parseJsonStringArray(agent.interests),
        catchphrase: agent.catchphrase,
        status: agent.status,
        createdAt: agent.createdAt,
      })),
    });
  } catch (err) {
    console.error("List A2A agents error:", err);
    return NextResponse.json(
      { error: "获取 A2A 智能体列表失败" },
      { status: 500 },
    );
  }
}
