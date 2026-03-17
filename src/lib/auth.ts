import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/secondme";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COOKIE_NAME = "claw_session";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Session {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix timestamp in seconds
}

// ---------------------------------------------------------------------------
// Read session (Server Components / Route Handlers)
// ---------------------------------------------------------------------------

/**
 * Read the session from the `claw_session` cookie.
 *
 * If the access token has expired, an automatic refresh is attempted.
 * Returns `null` when no valid session exists.
 *
 * NOTE: Because `cookies()` is read-only in Server Components we cannot
 * transparently persist the refreshed token back to the cookie from here.
 * The caller (typically a Route Handler or middleware) should detect the
 * `_refreshed` flag and persist accordingly.
 */
export async function getSession(): Promise<
  (Session & { _refreshed?: boolean }) | null
> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  let session: Session;
  try {
    session = JSON.parse(raw) as Session;
  } catch {
    return null;
  }

  if (
    !session.userId ||
    !session.accessToken ||
    !session.refreshToken ||
    !session.expiresAt
  ) {
    return null;
  }

  // Check expiry with a 60-second buffer
  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt > now + 60) {
    return session;
  }

  // Token expired — attempt refresh
  try {
    const tokens = await refreshAccessToken(session.refreshToken);
    const refreshed: Session = {
      userId: session.userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + tokens.expiresIn,
    };
    return { ...refreshed, _refreshed: true };
  } catch {
    // Refresh failed — session is dead
    return null;
  }
}

// ---------------------------------------------------------------------------
// Write / clear session (Route Handlers that return a NextResponse)
// ---------------------------------------------------------------------------

/**
 * Persist the session as an httpOnly cookie on the given response.
 */
export function setSession(response: NextResponse, session: Session): void {
  response.cookies.set(COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Delete the session cookie.
 */
export function clearSession(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
