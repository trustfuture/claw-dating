import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  try {
    // Delete in dependency order: messages/ratings -> dateSessions -> pairings -> event
    await prisma.$transaction(async (tx) => {
      // Find all pairings for this event
      const pairings = await tx.pairing.findMany({
        where: { eventId: id },
        select: { id: true },
      });
      const pairingIds = pairings.map((p) => p.id);

      // Find all date sessions
      const dateSessions = await tx.dateSession.findMany({
        where: { pairingId: { in: pairingIds } },
        select: { id: true },
      });
      const dateSessionIds = dateSessions.map((ds) => ds.id);

      // Delete messages and ratings
      await tx.message.deleteMany({ where: { dateSessionId: { in: dateSessionIds } } });
      await tx.rating.deleteMany({ where: { dateSessionId: { in: dateSessionIds } } });

      // Delete date sessions
      await tx.dateSession.deleteMany({ where: { pairingId: { in: pairingIds } } });

      // Delete pairings
      await tx.pairing.deleteMany({ where: { eventId: id } });

      // Delete event
      await tx.event.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
