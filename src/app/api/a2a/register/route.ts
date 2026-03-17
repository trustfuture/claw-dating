import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fetchAgentCard, validateAgentUrl } from "@/lib/a2a";
import { persistRefreshedSession } from "@/lib/session-refresh";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "未登录，请先登录" },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const rawUrl = body.url;
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return NextResponse.json(
      { error: "缺少 url 参数" },
      { status: 400 },
    );
  }

  const normalizedUrl = validateAgentUrl(rawUrl);
  if (!normalizedUrl) {
    return NextResponse.json(
      { error: "无效的 URL 格式，仅支持 http/https 协议" },
      { status: 400 },
    );
  }

  // Check if this URL is already registered
  const existing = await prisma.a2AAgent.findUnique({
    where: { url: normalizedUrl },
  });

  if (existing) {
    return NextResponse.json(
      { error: "该 Agent URL 已注册" },
      { status: 409 },
    );
  }

  // Fetch and parse the agent card
  let agentCard;
  try {
    agentCard = await fetchAgentCard(normalizedUrl);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "无法获取 Agent Card";
    return NextResponse.json(
      { error: `获取 Agent Card 失败: ${message}` },
      { status: 422 },
    );
  }

  // Create the A2A agent record
  const a2aAgent = await prisma.a2AAgent.create({
    data: {
      url: normalizedUrl,
      name: agentCard.name,
      avatarEmoji: agentCard.metadata.avatarEmoji,
      personalityType: agentCard.metadata.personalityType,
      interests: JSON.stringify(agentCard.metadata.interests),
      catchphrase: agentCard.metadata.catchphrase,
      status: "online",
      agentCardRaw: JSON.stringify(agentCard.raw),
      registeredBy: session.userId,
    },
  });

  const response = NextResponse.json(
    {
      agent: {
        id: a2aAgent.id,
        url: a2aAgent.url,
        name: a2aAgent.name,
        avatarEmoji: a2aAgent.avatarEmoji,
        personalityType: a2aAgent.personalityType,
        interests: agentCard.metadata.interests,
        catchphrase: a2aAgent.catchphrase,
        status: a2aAgent.status,
        createdAt: a2aAgent.createdAt,
      },
    },
    { status: 201 },
  );

  await persistRefreshedSession(response, session);
  return response;
}
