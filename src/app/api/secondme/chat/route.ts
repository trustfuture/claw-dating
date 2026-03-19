import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendChatMessage } from "@/lib/secondme";
import { persistRefreshedSession } from "@/lib/session-refresh";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "未登录，请先登录" },
      { status: 401 },
    );
  }

  // Rate limit chat proxy
  const rl = checkRateLimit(`chat:${session.userId}`, RATE_LIMITS.general);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "操作太频繁，请稍后再试" },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const { message, sessionId } = body as {
      message?: string;
      sessionId?: string;
    };

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "消息内容不能为空" },
        { status: 400 },
      );
    }

    const result = await sendChatMessage(
      session.accessToken,
      message,
      sessionId,
    );

    const response = NextResponse.json({
      text: result.text,
      sessionId: result.sessionId,
    });

    await persistRefreshedSession(response, session);

    return response;
  } catch (err) {
    logger.error("SecondMe chat proxy error", { route: "/api/secondme/chat", error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "与 SecondMe 对话失败，请重试" },
      { status: 502 },
    );
  }
}
