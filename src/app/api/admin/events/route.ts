import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAllEventSummaries } from "@/lib/api-view";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const events = await getAllEventSummaries();
  return NextResponse.json({ events });
}
