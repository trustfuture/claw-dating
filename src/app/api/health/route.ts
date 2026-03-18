import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  let dbOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // DB unreachable
  }

  const status = dbOk ? 200 : 503;

  return NextResponse.json(
    {
      status: dbOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: dbOk ? "connected" : "disconnected",
      latencyMs: Date.now() - start,
    },
    { status },
  );
}
