import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { persistRefreshedSession } from "@/lib/session-refresh";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(
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

  const rl = checkRateLimit(`date-cancel:${session.userId}`, RATE_LIMITS.general);
  if (!rl.allowed) {
    return NextResponse.json({ error: "操作太频繁，请稍后再试" }, { status: 429 });
  }

  try {
    const dateSession = await prisma.dateSession.findUnique({
      where: { id },
    });

    if (!dateSession) {
      const response = NextResponse.json(
        { error: "约会不存在" },
        { status: 404 },
      );
      await persistRefreshedSession(response, session);
      return response;
    }

    if (dateSession.status !== "pending" && dateSession.status !== "in_progress") {
      const response = NextResponse.json(
        { error: "只能取消等待中或进行中的约会" },
        { status: 400 },
      );
      await persistRefreshedSession(response, session);
      return response;
    }

    await prisma.dateSession.update({
      where: { id },
      data: { status: "cancelled" },
    });

    const response = NextResponse.json({ success: true });
    await persistRefreshedSession(response, session);
    return response;
  } catch (err) {
    logger.error("Cancel date session error", { route: "/api/dates/[id]/cancel", error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "取消约会失败" },
      { status: 500 },
    );
  }
}
