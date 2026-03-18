import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const type = request.nextUrl.searchParams.get("type");

  try {
    if (type === "a2a") {
      await prisma.a2AAgent.delete({ where: { id } });
    } else {
      await prisma.agent.delete({ where: { id } });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败，可能该 Agent 已被删除" }, { status: 404 });
  }
}
