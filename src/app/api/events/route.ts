import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAllEventSummaries, getEventViewById, getLatestEventView } from "@/lib/api-view";
import { persistRefreshedSession } from "@/lib/session-refresh";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { EVENT_LIMITS } from "@/lib/constants";
import { sanitizeString } from "@/lib/sanitize";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "未登录，请先登录" },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all");

    if (all === "true") {
      const events = await getAllEventSummaries();
      const response = NextResponse.json({ events });
      await persistRefreshedSession(response, session);
      return response;
    }

    const event = await getLatestEventView();

    if (!event) {
      const response = NextResponse.json({ event: null });
      await persistRefreshedSession(response, session);
      return response;
    }

    const response = NextResponse.json({ event });
    await persistRefreshedSession(response, session);
    return response;
  } catch (err) {
    logger.error("Get event error", { route: "/api/events", error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "获取活动信息失败" },
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

  // Rate limit
  const rl = checkRateLimit(`event:${session.userId}`, RATE_LIMITS.eventCreate);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "操作太频繁，请稍后再试" },
      { status: 429 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { name, totalRounds: rawRounds, turnsPerAgent: rawTurns } = body as {
      name?: string;
      totalRounds?: number;
      turnsPerAgent?: number;
    };

    // Check if there's an active event that hasn't finished
    const latestEvent = await prisma.event.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (
      latestEvent &&
      latestEvent.phase !== "completed" &&
      latestEvent.phase !== "results"
    ) {
      return NextResponse.json(
        { error: "当前有正在进行的活动，请等待结束后再创建新活动" },
        { status: 400 },
      );
    }

    const totalRounds = Math.max(EVENT_LIMITS.MIN_ROUNDS, Math.min(EVENT_LIMITS.MAX_ROUNDS, Number(rawRounds) || EVENT_LIMITS.DEFAULT_ROUNDS));
    const turnsPerAgent = Math.max(EVENT_LIMITS.MIN_TURNS_PER_AGENT, Math.min(EVENT_LIMITS.MAX_TURNS_PER_AGENT, Number(rawTurns) || EVENT_LIMITS.DEFAULT_TURNS_PER_AGENT));

    const sanitizedName = sanitizeString(name, 50) || "龙虾相亲大会";

    const event = await prisma.event.create({
      data: {
        name: sanitizedName,
        phase: "registration",
        currentRound: 0,
        totalRounds,
        turnsPerAgent,
      },
    });

    const eventView = await getEventViewById(event.id);

    const response = NextResponse.json(
      { event: eventView ?? event },
      { status: 201 },
    );

    await persistRefreshedSession(response, session);

    return response;
  } catch (err) {
    logger.error("Create event error", { route: "/api/events", error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "创建活动失败，请重试" },
      { status: 500 },
    );
  }
}
