import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { persistRefreshedSession } from "@/lib/session-refresh";

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
    console.error("Cancel date session error:", err);
    return NextResponse.json(
      { error: "取消约会失败" },
      { status: 500 },
    );
  }
}
