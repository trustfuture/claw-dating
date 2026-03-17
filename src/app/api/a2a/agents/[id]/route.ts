import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { persistRefreshedSession } from "@/lib/session-refresh";

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
    const agent = await prisma.a2AAgent.findUnique({
      where: { id },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "A2A 智能体不存在" },
        { status: 404 },
      );
    }

    // Only the person who registered the agent (or anyone if registeredBy is null) can delete it
    if (agent.registeredBy && agent.registeredBy !== session.userId) {
      return NextResponse.json(
        { error: "只有注册者可以删除该智能体" },
        { status: 403 },
      );
    }

    await prisma.a2AAgent.delete({
      where: { id },
    });

    const response = NextResponse.json({ success: true });
    await persistRefreshedSession(response, session);
    return response;
  } catch (err) {
    console.error("Delete A2A agent error:", err);
    return NextResponse.json(
      { error: "删除 A2A 智能体失败" },
      { status: 500 },
    );
  }
}
