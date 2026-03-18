import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "未登录" }, { status: 401 }) };
  }
  if (session.role !== "admin") {
    return { session, error: NextResponse.json({ error: "无权限" }, { status: 403 }) };
  }
  return { session, error: null };
}
