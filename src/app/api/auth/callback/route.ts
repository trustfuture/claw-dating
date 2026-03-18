import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeToken, fetchUserInfo } from "@/lib/secondme";
import { setSession, type Session } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }

  try {
    // Exchange code for tokens
    const tokenData = await exchangeToken(code);

    // Fetch user info from SecondMe
    const userInfo = await fetchUserInfo(tokenData.accessToken);

    const secondmeUserId = String(userInfo.id ?? userInfo.userId ?? "");
    const name = String(userInfo.name ?? userInfo.username ?? "未知用户");
    const email = userInfo.email ? String(userInfo.email) : null;
    const avatarUrl = userInfo.avatarUrl
      ? String(userInfo.avatarUrl)
      : userInfo.avatar
        ? String(userInfo.avatar)
        : null;
    const route = userInfo.route ? String(userInfo.route) : null;

    if (!secondmeUserId) {
      console.error("SecondMe user info missing id:", userInfo);
      return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
    }

    // Calculate token expiry
    const tokenExpiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000)
      : null;

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { secondmeUserId },
      update: {
        name,
        email,
        avatarUrl,
        route,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken ?? null,
        tokenExpiresAt,
      },
      create: {
        secondmeUserId,
        name,
        email,
        avatarUrl,
        route,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken ?? null,
        tokenExpiresAt,
      },
    });

    // Determine role
    const adminUserIds = (process.env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const role = adminUserIds.includes(secondmeUserId)
      ? "admin"
      : user.role ?? "user";

    // Build session and set cookie on redirect response
    const session: Session = {
      userId: user.id,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken ?? "",
      expiresAt: tokenExpiresAt
        ? Math.floor(tokenExpiresAt.getTime() / 1000)
        : Math.floor(Date.now() / 1000) + 3600,
      role,
    };

    const response = NextResponse.redirect(new URL("/lobby", request.url));
    setSession(response, session);
    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }
}
