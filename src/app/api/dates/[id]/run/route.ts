import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { runDate } from "@/lib/date-engine";
import { persistRefreshedSession } from "@/lib/session-refresh";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

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

  // Rate limit
  const rl = checkRateLimit(`date:${session.userId}`, RATE_LIMITS.dateRun);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "操作太频繁，请稍后再试" },
      { status: 429 },
    );
  }

  // Verify date session exists and load event config
  const dateSession = await prisma.dateSession.findUnique({
    where: { id: dateSessionId },
    include: { pairing: { include: { event: true } } },
  });

  if (!dateSession) {
    return NextResponse.json(
      { error: "约会不存在" },
      { status: 404 },
    );
  }

  if (dateSession.status === "completed") {
    return NextResponse.json(
      { error: "约会已经结束" },
      { status: 400 },
    );
  }

  if (dateSession.status === "in_progress") {
    return NextResponse.json(
      { error: "约会正在进行中，请稍候" },
      { status: 409 },
    );
  }

  // Use streaming response to send progress updates
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }

      try {
        send("status", { message: "约会即将开始..." });

        const turnsPerAgent = dateSession.pairing.event.turnsPerAgent || 5;

        const result = await runDate(dateSessionId, {
          turnsPerAgent,
          onMessage(message) {
            send("message", message);
          },
          onRatings(ratings) {
            send("rating", { ratings });
          },
        });

        if (result.status === "completed") {
          send("complete", {
            message: "约会圆满结束!",
            dateSessionId: result.dateSessionId,
          });
        } else {
          send("error", {
            message: result.error ?? "约会过程中出现错误",
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "未知错误";
        send("error", { message: `约会出错: ${message}` });
      } finally {
        controller.close();
      }
    },
  });

  const response = new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });

  await persistRefreshedSession(response, session);

  return response;
}
