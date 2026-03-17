import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { persistRefreshedSession } from "@/lib/session-refresh";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "未登录，请先登录" },
      { status: 401 },
    );
  }

  try {
    const dateSession = await prisma.dateSession.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { turn: "asc" } },
        ratings: true,
        pairing: true,
      },
    });

    if (!dateSession) {
      const response = NextResponse.json(
        { error: "约会不存在" },
        { status: 404 },
      );
      await persistRefreshedSession(response, session);
      return response;
    }

    // Resolve agent info from pairing
    const agentIds = [dateSession.pairing.agentAId, dateSession.pairing.agentBId];
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true, avatarEmoji: true, personalityType: true },
    });
    const agentMap = new Map(agents.map((a) => [a.id, a]));

    const resolveAgent = (agentId: string) => {
      const agent = agentMap.get(agentId);
      return {
        id: agentId,
        name: agent?.name ?? "神秘嘉宾",
        avatarEmoji: agent?.avatarEmoji ?? "🦞",
        personalityType: agent?.personalityType ?? "",
      };
    };

    const serialized = {
      id: dateSession.id,
      status: dateSession.status,
      round: dateSession.round,
      createdAt: dateSession.createdAt,
      pairing: {
        id: dateSession.pairing.id,
        compatibilityScore: dateSession.pairing.compatibilityScore ?? 0,
        reasoning: dateSession.pairing.reasoning ?? "",
        round: dateSession.pairing.round,
        agentA: resolveAgent(dateSession.pairing.agentAId),
        agentB: resolveAgent(dateSession.pairing.agentBId),
      },
      messages: dateSession.messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderName,
        content: m.content,
        turn: m.turn,
        createdAt: m.createdAt,
      })),
      ratings: dateSession.ratings.map((r) => ({
        agentId: r.agentId,
        agentName: r.agentName,
        score: r.score,
        comment: r.comment ?? "",
      })),
    };

    const response = NextResponse.json({ dateSession: serialized });
    await persistRefreshedSession(response, session);
    return response;
  } catch (err) {
    console.error("Get date session error:", err);
    return NextResponse.json(
      { error: "获取约会信息失败" },
      { status: 500 },
    );
  }
}
