import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fetchUserShades } from "@/lib/secondme";
import { serializeAgent } from "@/lib/api-view";
import { persistRefreshedSession } from "@/lib/session-refresh";
import { validateAgentInput } from "@/lib/sanitize";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      agents: agents.map((agent) => serializeAgent(agent)),
    });
  } catch (err) {
    console.error("List agents error:", err);
    return NextResponse.json(
      { error: "获取智能体列表失败" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "未登录，请先登录" },
      { status: 401 },
    );
  }

  try {
    // Rate limit
    const rl = checkRateLimit(`agent:${session.userId}`, RATE_LIMITS.agentCreate);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "操作太频繁，请稍后再试" },
        { status: 429 },
      );
    }

    // Check if user already has an agent
    const existing = await prisma.agent.findFirst({
      where: { userId: session.userId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "每位用户只能创建一个约会智能体" },
        { status: 409 },
      );
    }

    const body = await request.json();
    const validation = validateAgentInput(body);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }
    const { name, personalityType, interests, catchphrase, avatarEmoji } = validation.data;

    // Auto-fetch shades from SecondMe to enrich interests
    let enrichedInterests = [...interests];
    try {
      const shades = await fetchUserShades(session.accessToken);
      if (Array.isArray(shades) && shades.length > 0) {
        for (const shade of shades) {
          const s = shade as Record<string, unknown>;
          if (s.personality && typeof s.personality === "string") {
            enrichedInterests.push(s.personality);
          }
          if (s.description && typeof s.description === "string") {
            // Extract keywords from shade description
            const keywords = String(s.description)
              .split(/[,，、\s]+/)
              .filter((w) => w.length >= 2 && w.length <= 10)
              .slice(0, 3);
            enrichedInterests.push(...keywords);
          }
        }
      }
    } catch (err) {
      // Non-fatal: shade fetch failure should not block agent creation
      console.warn("Failed to fetch SecondMe shades for enrichment:", err);
    }

    // Deduplicate interests
    enrichedInterests = [...new Set(enrichedInterests)];

    // Get user's SecondMe route for the agent
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    const agent = await prisma.agent.create({
      data: {
        userId: session.userId,
        name: name.trim(),
        personalityType: personalityType ?? "",
        interests: JSON.stringify(enrichedInterests),
        catchphrase: catchphrase ?? "",
        avatarEmoji: avatarEmoji ?? "",
        secondmeRoute: user?.route ?? "",
        status: "online",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    const response = NextResponse.json(
      { agent: serializeAgent(agent) },
      { status: 201 },
    );

    // Persist refreshed session if needed
    await persistRefreshedSession(response, session);

    return response;
  } catch (err) {
    console.error("Create agent error:", err);
    return NextResponse.json(
      { error: "创建智能体失败，请重试" },
      { status: 500 },
    );
  }
}
