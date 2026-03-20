import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

export const runtime = "edge";

const size = { width: 1200, height: 630 };

/**
 * GET /api/events/[id]/share/[agentId]
 * Generate a shareable OG image (score card) for an agent's performance in an event.
 * Public endpoint — no auth required for sharing.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> },
) {
  const { id: eventId, agentId } = await params;

  try {
    // Load event data
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { name: true },
    });

    if (!event) {
      return NextResponse.json({ error: "活动不存在" }, { status: 404 });
    }

    // Try SecondMe agent first, then A2A
    let agentName = "";
    let agentEmoji = "🦞";

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { name: true, avatarEmoji: true },
    });

    if (agent) {
      agentName = agent.name;
      agentEmoji = agent.avatarEmoji || "🦞";
    } else {
      const a2a = await prisma.a2AAgent.findUnique({
        where: { id: agentId },
        select: { name: true, avatarEmoji: true },
      });
      if (a2a) {
        agentName = a2a.name;
        agentEmoji = a2a.avatarEmoji || "🦞";
      }
    }

    if (!agentName) {
      return NextResponse.json({ error: "嘉宾不存在" }, { status: 404 });
    }

    // Get agent's stats for this event
    const dateSessions = await prisma.dateSession.findMany({
      where: {
        pairing: { eventId },
        status: "completed",
        OR: [
          { pairing: { agentAId: agentId } },
          { pairing: { agentBId: agentId } },
        ],
      },
      include: {
        ratings: true,
        pairing: true,
      },
    });

    const totalDates = dateSessions.length;
    const ratingsReceived = dateSessions.flatMap((ds) =>
      ds.ratings.filter((r) => r.agentId !== agentId),
    );
    const avgScore =
      ratingsReceived.length > 0
        ? Math.round(
            (ratingsReceived.reduce((sum, r) => sum + r.score, 0) /
              ratingsReceived.length) *
              10,
          ) / 10
        : 0;

    const bestCompat = Math.max(
      0,
      ...dateSessions.map((ds) => ds.pairing.compatibilityScore ?? 0),
    );

    // Get highlight quote if available
    let highlightQuote = "";
    for (const ds of dateSessions) {
      if (ds.highlights) {
        try {
          const highlights = JSON.parse(ds.highlights);
          if (Array.isArray(highlights) && highlights.length > 0) {
            highlightQuote = String(highlights[0].quote || "").slice(0, 60);
            break;
          }
        } catch { /* ignore */ }
      }
    }

    return new ImageResponse(
      (
        <div
          style={{
            background: "linear-gradient(135deg, #faf9f7 0%, #f0e8ff 50%, #ffe8ef 100%)",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "sans-serif",
            padding: "40px",
          }}
        >
          {/* Agent emoji */}
          <div style={{ fontSize: 100, marginBottom: 10 }}>{agentEmoji}</div>

          {/* Agent name */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: "#1a1a1a",
              marginBottom: 8,
            }}
          >
            {agentName.slice(0, 20)}
          </div>

          {/* Event name */}
          <div
            style={{
              fontSize: 22,
              color: "#6366f1",
              fontWeight: 600,
              marginBottom: 30,
            }}
          >
            {(event.name || "龙虾相亲大会").slice(0, 30)}
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: 60,
              marginBottom: 30,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: "#ef4444" }}>
                {avgScore || "—"}
              </div>
              <div style={{ fontSize: 18, color: "#6b7280", marginTop: 4 }}>平均得分</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: "#6366f1" }}>
                {totalDates}
              </div>
              <div style={{ fontSize: 18, color: "#6b7280", marginTop: 4 }}>约会次数</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: "#14b8a6" }}>
                {bestCompat > 0 ? `${bestCompat}%` : "—"}
              </div>
              <div style={{ fontSize: 18, color: "#6b7280", marginTop: 4 }}>最高匹配</div>
            </div>
          </div>

          {/* Highlight quote */}
          {highlightQuote && (
            <div
              style={{
                fontSize: 20,
                color: "#4b5563",
                fontStyle: "italic",
                maxWidth: 700,
                textAlign: "center",
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              &ldquo;{highlightQuote}&rdquo;
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              fontSize: 18,
              color: "#9ca3af",
              position: "absolute",
              bottom: 30,
            }}
          >
            🦞 龙虾相亲大会 | Claw Dating
          </div>
        </div>
      ),
      { ...size },
    );
  } catch {
    return NextResponse.json({ error: "生成分享卡失败" }, { status: 500 });
  }
}
