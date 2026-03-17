import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { serializeAgent } from "@/lib/api-view";
import { persistRefreshedSession } from "@/lib/session-refresh";

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
    const {
      name,
      avatarEmoji,
      personalityType,
      interests,
      catchphrase,
      loveLang,
    } = body as {
      name?: string;
      avatarEmoji?: string;
      personalityType?: string;
      interests?: string[];
      catchphrase?: string;
      loveLang?: string;
    };

    // Build update data — only include fields that were provided
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: "请为你的智能体取个名字" },
          { status: 400 },
        );
      }
      updateData.name = name.trim();
    }
    if (avatarEmoji !== undefined) updateData.avatarEmoji = avatarEmoji;
    if (personalityType !== undefined) updateData.personalityType = personalityType;
    if (interests !== undefined) updateData.interests = JSON.stringify(interests);
    if (catchphrase !== undefined) updateData.catchphrase = catchphrase;
    if (loveLang !== undefined) updateData.loveLang = loveLang;

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
