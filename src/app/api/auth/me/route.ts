import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { serializeAuthPayload } from "@/lib/api-view";
import { persistRefreshedSession } from "@/lib/session-refresh";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "未登录，请先登录" },
      { status: 401 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        agents: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 },
      );
    }

    const response = NextResponse.json(
      serializeAuthPayload(user),
    );

    // If the session was refreshed, persist the updated token
    await persistRefreshedSession(response, session);

    return response;
  } catch (err) {
    console.error("Get current user error:", err);
    return NextResponse.json(
      { error: "获取用户信息失败" },
      { status: 500 },
    );
  }
}
