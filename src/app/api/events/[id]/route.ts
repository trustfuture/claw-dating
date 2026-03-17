import { NextRequest, NextResponse } from "next/server";
import { getEventViewById } from "@/lib/api-view";
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
