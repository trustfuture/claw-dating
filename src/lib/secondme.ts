const BASE_URL =
  process.env.SECONDME_API_BASE_URL ?? "https://api.mindverse.com/gate/lab";

const CLIENT_ID = process.env.SECONDME_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SECONDME_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.SECONDME_REDIRECT_URI ?? "";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ChatResult {
  text: string;
  sessionId: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Unwrap the standard SecondMe envelope `{ code: 0, data: ... }`.
 * Throws on non-zero code or network error.
 */
async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `SecondMe API ${res.status} ${res.statusText}: ${body}`,
    );
  }
  const result = (await res.json()) as { code: number; data: T; msg?: string };
  if (result.code !== 0) {
    throw new Error(
      `SecondMe API error code ${result.code}: ${result.msg ?? "unknown"}`,
    );
  }
  return result.data;
}

/**
 * Parse an SSE response stream and return concatenated text + sessionId.
 */
async function parseSSEStream(res: Response): Promise<ChatResult> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `SecondMe SSE ${res.status} ${res.statusText}: ${body}`,
    );
  }

  const raw = await res.text();
  const lines = raw.split("\n");

  let text = "";
  let sessionId: string | null = null;

  for (const line of lines) {
    if (line.startsWith("event:session")) {
      // The next "data: " line carries the session id — but some implementations
      // put it on the same line as "event:session data:xxx". We handle both.
      continue;
    }

    if (!line.startsWith("data: ")) continue;

    const payload = line.slice("data: ".length).trim();

    if (payload === "[DONE]") continue;

    // Session id lines are plain strings, not JSON
    // Heuristic: if previous line was event:session, this is the sessionId
    try {
      const json = JSON.parse(payload) as {
        choices?: { delta?: { content?: string } }[];
        sessionId?: string;
      };

      if (json.sessionId) {
        sessionId = json.sessionId;
      }

      const delta = json.choices?.[0]?.delta?.content;
      if (delta) {
        text += delta;
      }
    } catch {
      // Could be a bare session id string
      if (payload && !payload.startsWith("{")) {
        sessionId = payload;
      }
    }
  }

  return { text, sessionId };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Exchange an OAuth authorization code for access + refresh tokens.
 */
export async function exchangeToken(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const res = await fetch(`${BASE_URL}/api/oauth/token/code`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await unwrap<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>(res);

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
  };
}

/**
 * Refresh an expired access token.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const res = await fetch(`${BASE_URL}/api/oauth/token/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await unwrap<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>(res);

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
  };
}

/**
 * Fetch the authenticated user's profile info.
 */
export async function fetchUserInfo(
  accessToken: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}/api/secondme/user/info`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return unwrap<Record<string, unknown>>(res);
}

/**
 * Fetch the user's SecondMe shades (AI personas).
 */
export async function fetchUserShades(
  accessToken: string,
): Promise<unknown[]> {
  const res = await fetch(`${BASE_URL}/api/secondme/user/shades`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await unwrap<{ shades: unknown[] }>(res);
  return data.shades;
}

/**
 * Fetch the user's soft-memory list.
 */
export async function fetchSoftMemory(
  accessToken: string,
): Promise<unknown[]> {
  const res = await fetch(`${BASE_URL}/api/secondme/user/softmemory`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await unwrap<{ list: unknown[] }>(res);
  return data.list;
}

/**
 * Send a chat message to the user's SecondMe and collect the full response
 * via SSE streaming.
 */
export async function sendChatMessage(
  accessToken: string,
  message: string,
  sessionId?: string,
): Promise<ChatResult> {
  const payload: Record<string, unknown> = { message };
  if (sessionId) {
    payload.sessionId = sessionId;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(`${BASE_URL}/api/secondme/chat/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    return await parseSSEStream(res);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("SecondMe 响应超时（60秒）");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Send an "act" message (with action control) and parse the SSE response
 * into a structured JSON object.
 */
export async function sendActMessage(
  accessToken: string,
  message: string,
  actionControl: string,
  sessionId?: string,
): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = { message, actionControl };
  if (sessionId) {
    payload.sessionId = sessionId;
  }

  const res = await fetch(`${BASE_URL}/api/secondme/act/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const { text } = await parseSSEStream(res);

  // The act endpoint returns structured JSON in its streamed text
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

/**
 * Report / ingest agent memory back to SecondMe.
 */
export async function reportAgentMemory(
  accessToken: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `${BASE_URL}/api/secondme/agent_memory/ingest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  return unwrap<Record<string, unknown>>(res);
}
