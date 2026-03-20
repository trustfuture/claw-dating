import { NextRequest, NextResponse } from "next/server";
import { getEventViewById } from "@/lib/api-view";
import { getSession } from "@/lib/auth";
import { persistRefreshedSession } from "@/lib/session-refresh";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();

  try {
    const event = await getEventViewById(id);

    if (!event) {
      return NextResponse.json(
        { error: "活动不存在" },
        { status: 404 },
      );
    }

    const response = NextResponse.json({ event });
    if (session) {
      await persistRefreshedSession(response, session);
    }
    return response;
  } catch (err) {
    logger.error("Get event detail error", { route: "/api/events/[id]", error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "获取活动详情失败" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      return NextResponse.json(
        { error: "活动不存在" },
        { status: 404 },
      );
    }

    if (event.phase !== "registration" && event.phase !== "results" && event.phase !== "completed") {
      return NextResponse.json(
        { error: "只能删除报名中或已结束的活动" },
        { status: 400 },
      );
    }

    // A4: Only participants can delete
    const userAgent = await prisma.agent.findFirst({
      where: { userId: session.userId },
    });
    if (userAgent) {
      const participantIds: string[] = JSON.parse(event.participantIds || "[]");
      if (!participantIds.includes(userAgent.id)) {
        return NextResponse.json(
          { error: "只有活动参与者才能删除活动" },
          { status: 403 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "你没有智能体，无法操作" },
        { status: 403 },
      );
    }

    // Cascade delete: ratings -> messages -> dateSessions -> pairings -> event
    const pairings = await prisma.pairing.findMany({
      where: { eventId: id },
      select: { id: true },
    });
    const pairingIds = pairings.map((p) => p.id);

    const dateSessions = await prisma.dateSession.findMany({
      where: { pairingId: { in: pairingIds } },
      select: { id: true },
    });
    const dateSessionIds = dateSessions.map((d) => d.id);

    await prisma.$transaction([
      prisma.rating.deleteMany({ where: { dateSessionId: { in: dateSessionIds } } }),
      prisma.message.deleteMany({ where: { dateSessionId: { in: dateSessionIds } } }),
      prisma.dateSession.deleteMany({ where: { pairingId: { in: pairingIds } } }),
      prisma.pairing.deleteMany({ where: { eventId: id } }),
      prisma.event.delete({ where: { id } }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logger.error("Delete event error", { route: "/api/events/[id]", error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "删除活动失败，请重试" },
      { status: 500 },
    );
  }
}

// B2: Reset a stuck "dating" event back to registration
export async function PATCH(
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
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      return NextResponse.json(
        { error: "活动不存在" },
        { status: 404 },
      );
    }

    if (event.phase !== "dating") {
      return NextResponse.json(
        { error: "只能重置进行中的活动" },
        { status: 400 },
      );
    }

    // Cascade delete dating data and reset phase
    const pairings = await prisma.pairing.findMany({
      where: { eventId: id },
      select: { id: true },
    });
    const pairingIds = pairings.map((p) => p.id);

    const dateSessions = await prisma.dateSession.findMany({
      where: { pairingId: { in: pairingIds } },
      select: { id: true },
    });
    const dateSessionIds = dateSessions.map((d) => d.id);

    await prisma.$transaction([
      prisma.rating.deleteMany({ where: { dateSessionId: { in: dateSessionIds } } }),
      prisma.message.deleteMany({ where: { dateSessionId: { in: dateSessionIds } } }),
      prisma.dateSession.deleteMany({ where: { pairingId: { in: pairingIds } } }),
      prisma.pairing.deleteMany({ where: { eventId: id } }),
      prisma.event.update({
        where: { id },
        data: { phase: "registration", currentRound: 0 },
      }),
    ]);

    return NextResponse.json({ message: "活动已重置为报名状态" });
  } catch (err) {
    logger.error("Reset event error", { route: "/api/events/[id]", error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "重置活动失败，请重试" },
      { status: 500 },
    );
  }
}
