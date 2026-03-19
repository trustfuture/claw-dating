import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { reportDateMemoryForSession } from "@/lib/date-engine";
import { persistRefreshedSession } from "@/lib/session-refresh";
import { logger } from "@/lib/logger";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: dateSessionId } = await params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "未登录，请先登录" },
      { status: 401 },
    );
  }

  try {
    const result = await reportDateMemoryForSession(dateSessionId);

    if (!result.reported) {
      const response = NextResponse.json(
        { error: result.error ?? "无法报告约会记忆" },
        { status: 400 },
      );
      await persistRefreshedSession(response, session);
      return response;
    }

    const response = NextResponse.json({
      success: true,
      message: "约会记忆已成功报告给 SecondMe",
    });

    await persistRefreshedSession(response, session);
    return response;
  } catch (err) {
    logger.error("Memory report API error", { route: "/api/dates/[id]/memory", error: err instanceof Error ? err.message : String(err) });
    const response = NextResponse.json(
      { error: "报告约会记忆失败，请重试" },
      { status: 502 },
    );
    await persistRefreshedSession(response, session);
    return response;
  }
}
