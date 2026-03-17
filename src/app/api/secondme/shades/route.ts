import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchUserShades } from "@/lib/secondme";
import { persistRefreshedSession } from "@/lib/session-refresh";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "未登录，请先登录" },
      { status: 401 },
    );
  }

  try {
    const shades = await fetchUserShades(session.accessToken);

    const response = NextResponse.json({ shades });

    await persistRefreshedSession(response, session);

    return response;
  } catch (err) {
    console.error("Fetch shades error:", err);
    return NextResponse.json(
      { error: "获取 SecondMe 分身信息失败" },
      { status: 502 },
    );
  }
}
