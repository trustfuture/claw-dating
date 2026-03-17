import type { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSession, type Session } from "@/lib/auth";

export async function persistRefreshedSession(
  response: NextResponse,
  session: Session & { _refreshed?: boolean },
) {
  if (!session._refreshed) {
    return;
  }

  setSession(response, {
    userId: session.userId,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
  });

  await prisma.user.updateMany({
    where: { id: session.userId },
    data: {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken || null,
      tokenExpiresAt: new Date(session.expiresAt * 1000),
    },
  });
}
