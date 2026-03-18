import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllEventSummaries } from "@/lib/api-view";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const events = await getAllEventSummaries();
  return NextResponse.json({ events });
}
