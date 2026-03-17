import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { serializeAgent } from "@/lib/api-view";
import { persistRefreshedSession } from "@/lib/session-refresh";
import { validateAgentInput } from "@/lib/sanitize";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "未登录，请先登录" },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    // Verify ownership
    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "智能体不存在" },
        { status: 404 },
      );
    }

    if (agent.userId !== session.userId) {
      return NextResponse.json(
        { error: "无权修改此智能体" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validation = validateAgentInput(body, true);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }
    const { name, avatarEmoji, personalityType, interests, catchphrase } = validation.data;

    // Build update data — only include fields that were provided
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = name;
    if (body.avatarEmoji !== undefined) updateData.avatarEmoji = avatarEmoji;
    if (body.personalityType !== undefined) updateData.personalityType = personalityType;
    if (body.interests !== undefined) updateData.interests = JSON.stringify(interests);
    if (body.catchphrase !== undefined) updateData.catchphrase = catchphrase;

    const updated = await prisma.agent.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    const response = NextResponse.json({ agent: serializeAgent(updated) });

    await persistRefreshedSession(response, session);

    return response;
  } catch (err) {
    console.error("Update agent error:", err);
    return NextResponse.json(
      { error: "更新智能体失败，请重试" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "未登录，请先登录" },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    // Verify ownership
    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "智能体不存在" },
        { status: 404 },
      );
    }

    if (agent.userId !== session.userId) {
      return NextResponse.json(
        { error: "无权删除此智能体" },
        { status: 403 },
      );
    }

    // A2: Block deletion if agent is in an active dating event
    const activePairing = await prisma.pairing.findFirst({
      where: {
        OR: [{ agentAId: id }, { agentBId: id }],
        event: { phase: "dating" },
      },
    });
    if (activePairing) {
      return NextResponse.json(
        { error: "你的智能体正在参加活动中，活动结束后才能删除" },
        { status: 400 },
      );
    }

    await prisma.agent.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Delete agent error:", err);
    return NextResponse.json(
      { error: "删除智能体失败，请重试" },
      { status: 500 },
    );
  }
}
