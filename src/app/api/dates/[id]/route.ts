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

    const response = NextResponse.json({ dateSession });
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
