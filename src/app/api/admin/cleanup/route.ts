import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const daysOld = Math.max(1, Math.min(365, Number(body.daysOld) || 30));
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    // Find old completed/results events
    const oldEvents = await prisma.event.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        phase: { in: ["results", "completed"] },
      },
      select: { id: true, name: true, createdAt: true },
    });

    if (oldEvents.length === 0) {
      return NextResponse.json({ deleted: 0, message: "没有需要清理的活动" });
    }

    // Delete old events (cascade will handle pairings, date sessions, messages, ratings)
    const result = await prisma.event.deleteMany({
      where: {
        id: { in: oldEvents.map((e) => e.id) },
      },
    });

    return NextResponse.json({
      deleted: result.count,
      message: `已清理 ${result.count} 个超过 ${daysOld} 天的活动`,
      events: oldEvents.map((e) => ({
        id: e.id,
        name: e.name,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    console.error("Cleanup error:", err);
    return NextResponse.json({ error: "清理失败" }, { status: 500 });
  }
}
