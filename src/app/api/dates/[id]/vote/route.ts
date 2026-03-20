import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const VALID_VOTE_TYPES = new Set(["chemistry", "not_feeling_it"]);

/**
 * POST /api/dates/[id]/vote
 * Create or update a vote on a date session.
 * Requires authentication. One vote per user per date.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: dateSessionId } = await params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // Rate limit: 30 votes per minute
  const rl = checkRateLimit(`vote:${session.userId}`, { limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "投票太频繁" }, { status: 429 });
  }

  let body: { voteType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { voteType } = body;
  if (!voteType || !VALID_VOTE_TYPES.has(voteType)) {
    return NextResponse.json(
      { error: "无效的投票类型，需要 chemistry 或 not_feeling_it" },
      { status: 400 },
    );
  }

  // Check date session exists
  const dateSession = await prisma.dateSession.findUnique({
    where: { id: dateSessionId },
  });

  if (!dateSession) {
    return NextResponse.json({ error: "约会不存在" }, { status: 404 });
  }

  try {
    // Upsert: create or update existing vote
    const vote = await prisma.vote.upsert({
      where: {
        userId_dateSessionId: {
          userId: session.userId,
          dateSessionId,
        },
      },
      create: {
        userId: session.userId,
        dateSessionId,
        voteType,
      },
      update: {
        voteType,
      },
    });

    // Get updated vote counts
    const counts = await getVoteCounts(dateSessionId);

    return NextResponse.json({
      vote: { id: vote.id, voteType: vote.voteType },
      counts,
    });
  } catch (err) {
    logger.error("Vote error", {
      route: "/api/dates/[id]/vote",
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "投票失败" }, { status: 500 });
  }
}

/**
 * GET /api/dates/[id]/vote
 * Get vote counts and current user's vote for a date session.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: dateSessionId } = await params;

  const session = await getSession();

  const counts = await getVoteCounts(dateSessionId);

  let userVote: string | null = null;
  if (session) {
    const existing = await prisma.vote.findUnique({
      where: {
        userId_dateSessionId: {
          userId: session.userId,
          dateSessionId,
        },
      },
    });
    userVote = existing?.voteType ?? null;
  }

  return NextResponse.json({ counts, userVote });
}

async function getVoteCounts(dateSessionId: string) {
  const [chemistry, notFeelingIt] = await Promise.all([
    prisma.vote.count({
      where: { dateSessionId, voteType: "chemistry" },
    }),
    prisma.vote.count({
      where: { dateSessionId, voteType: "not_feeling_it" },
    }),
  ]);

  return { chemistry, not_feeling_it: notFeelingIt };
}
