import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "claw_session";

// Routes that require authentication
const PROTECTED_ROUTES = ["/lobby", "/dates", "/admin"];

// Admin-only routes
const ADMIN_ROUTES = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and API routes (API routes handle their own auth)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check if route requires auth
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for session cookie
  const session = request.cookies.get(COOKIE_NAME)?.value;
  if (!session) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("error", "auth_required");
    return NextResponse.redirect(loginUrl);
  }

  // Validate session shape
  let parsed: { userId?: string; accessToken?: string; expiresAt?: number; role?: string };
  try {
    parsed = JSON.parse(session);
    if (!parsed.userId || !parsed.accessToken) {
      throw new Error("Invalid session");
    }
  } catch {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("error", "auth_required");
    return NextResponse.redirect(loginUrl);
  }

  // Check token expiry
  if (parsed.expiresAt && parsed.expiresAt < Math.floor(Date.now() / 1000)) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("error", "auth_required");
    return NextResponse.redirect(loginUrl);
  }

  // Admin route check
  const isAdmin = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  if (isAdmin && parsed.role !== "admin") {
    const lobbyUrl = new URL("/lobby", request.url);
    lobbyUrl.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(lobbyUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and API
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
