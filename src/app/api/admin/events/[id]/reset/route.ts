import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.$transaction(async (tx) => {
      const pairings = await tx.pairing.findMany({
        where: { eventId: id },
        select: { id: true },
      });
      const pairingIds = pairings.map((p) => p.id);

      const dateSessions = await tx.dateSession.findMany({
        where: { pairingId: { in: pairingIds } },
        select: { id: true },
      });
      const dateSessionIds = dateSessions.map((ds) => ds.id);

      await tx.message.deleteMany({ where: { dateSessionId: { in: dateSessionIds } } });
      await tx.rating.deleteMany({ where: { dateSessionId: { in: dateSessionIds } } });
      await tx.dateSession.deleteMany({ where: { pairingId: { in: pairingIds } } });
      await tx.pairing.deleteMany({ where: { eventId: id } });

      await tx.event.update({
        where: { id },
        data: {
          phase: "registration",
          currentRound: 0,
          participantIds: "[]",
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "重置失败" }, { status: 500 });
  }
}
