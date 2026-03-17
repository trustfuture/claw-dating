import { NextRequest, NextResponse } from "next/server";
import { getEventViewById } from "@/lib/api-view";
import { getSession } from "@/lib/auth";
import { persistRefreshedSession } from "@/lib/session-refresh";
import { prisma } from "@/lib/db";

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
    const event = await getEventViewById(id);

    if (!event) {
      const response = NextResponse.json(
        { error: "活动不存在" },
        { status: 404 },
      );
      await persistRefreshedSession(response, session);
      return response;
    }

    const response = NextResponse.json({ event });
    await persistRefreshedSession(response, session);
    return response;
  } catch (err) {
    console.error("Get event detail error:", err);
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
    console.error("Delete event error:", err);
    return NextResponse.json(
      { error: "删除活动失败，请重试" },
      { status: 500 },
    );
  }
}
