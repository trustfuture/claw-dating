/**
 * A2A (Agent-to-Agent) protocol utilities.
 *
 * Handles fetching and parsing Agent Cards from external A2A-compatible agents,
 * and sending/receiving messages via the A2A protocol.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface A2AMessagePayload {
  jsonrpc: "2.0";
  method: "message/send";
  id: string;
  params: {
    message: {
      role: "user";
      parts: { type: "text"; text: string }[];
    };
    sessionId?: string;
  };
}

export interface A2AMessageResponse {
  text: string;
  sessionId: string | null;
}

export interface AgentCardMetadata {
  personalityType: string;
  interests: string[];
  dealBreakers: string[];
  loveLanguage: string;
  catchphrase: string;
  avatarEmoji: string;
  nameCn: string;
}

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  metadata: AgentCardMetadata;
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

/**
 * Validate and normalize a URL string. Returns the normalized URL or null
 * if the input is not a valid HTTP(S) URL.
 */
export function validateAgentUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // Only allow http and https protocols
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  // Block localhost and private IPs in production
  const hostname = url.hostname.toLowerCase();
  if (process.env.NODE_ENV === "production") {
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname === "[::1]"
    ) {
      return null;
    }
  }

  // Remove trailing slash for consistency
  return url.origin + url.pathname.replace(/\/+$/, "");
}

// ---------------------------------------------------------------------------
// Fetch Agent Card
// ---------------------------------------------------------------------------

/**
 * Fetch the Agent Card from `{baseUrl}/.well-known/agent.json`.
 *
 * Throws on network errors, non-2xx responses, or invalid JSON.
 */
export async function fetchAgentCard(baseUrl: string): Promise<AgentCard> {
  const normalizedUrl = validateAgentUrl(baseUrl);
  if (!normalizedUrl) {
    throw new Error("Invalid agent URL");
  }

  const agentJsonUrl = `${normalizedUrl}/.well-known/agent.json`;

  let response: Response;
  try {
    response = await fetch(agentJsonUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000), // 10 second timeout
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Agent URL timed out (10s limit)");
    }
    throw new Error(
      `Failed to connect to agent at ${normalizedUrl}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Agent returned HTTP ${response.status} from ${agentJsonUrl}`,
    );
  }

  let rawCard: Record<string, unknown>;
  try {
    rawCard = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error("Agent card is not valid JSON");
  }

  if (!rawCard || typeof rawCard !== "object") {
    throw new Error("Agent card must be a JSON object");
  }

  const metadata = parseAgentCardMetadata(rawCard);

  const name =
    typeof rawCard.name === "string" && rawCard.name.trim()
      ? rawCard.name.trim().slice(0, 50)
      : metadata.nameCn || "Unknown Agent";

  const description =
    typeof rawCard.description === "string"
      ? rawCard.description.slice(0, 500)
      : "";

  return {
    name,
    description,
    url: normalizedUrl,
    metadata,
    raw: rawCard,
  };
}

// ---------------------------------------------------------------------------
// Parse Agent Card Metadata
// ---------------------------------------------------------------------------

/**
 * Extract dating-relevant metadata from a raw agent card object.
 *
 * Handles both the top-level metadata convention and fallbacks for
 * cards that put fields at the root level.
 */
export function parseAgentCardMetadata(
  card: Record<string, unknown>,
): AgentCardMetadata {
  const meta =
    card.metadata && typeof card.metadata === "object"
      ? (card.metadata as Record<string, unknown>)
      : {};

  function getString(
    key: string,
    maxLength = 100,
  ): string {
    // Check metadata first, then top-level card
    const value = meta[key] ?? card[key];
    if (typeof value === "string") {
      return value.replace(/<[^>]*>/g, "").trim().slice(0, maxLength);
    }
    return "";
  }

  function getStringArray(key: string, maxItems = 10): string[] {
    const value = meta[key] ?? card[key];
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.replace(/<[^>]*>/g, "").trim().slice(0, 30))
        .filter(Boolean)
        .slice(0, maxItems);
    }
    if (typeof value === "string") {
      // Try to parse comma-separated or JSON array
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim().slice(0, 30))
            .filter(Boolean)
            .slice(0, maxItems);
        }
      } catch {
        // Try comma-separated
        return value
          .split(/[,，、]/)
          .map((s) => s.trim().slice(0, 30))
          .filter(Boolean)
          .slice(0, maxItems);
      }
    }
    return [];
  }

  return {
    personalityType: getString("personality_type", 50),
    interests: getStringArray("interests"),
    dealBreakers: getStringArray("deal_breakers"),
    loveLanguage: getString("love_language", 50),
    catchphrase: getString("catchphrase", 100),
    avatarEmoji: getString("avatar_emoji", 10) || "\uD83E\uDD9E",
    nameCn: getString("name_cn", 50),
  };
}

// ---------------------------------------------------------------------------
// Send A2A Message
// ---------------------------------------------------------------------------

/**
 * Send a message to an external A2A agent via the JSON-RPC protocol.
 *
 * Posts to `{agentUrl}/a2a` with a `message/send` JSON-RPC request.
 * Extracts the text response from the result.
 */
export async function sendA2AMessage(
  agentUrl: string,
  message: string,
  sessionId?: string,
): Promise<A2AMessageResponse> {
  const normalizedUrl = validateAgentUrl(agentUrl);
  if (!normalizedUrl) {
    throw new Error("Invalid A2A agent URL");
  }

  const a2aEndpoint = `${normalizedUrl}/a2a`;
  const requestId = `claw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const payload: A2AMessagePayload = {
    jsonrpc: "2.0",
    method: "message/send",
    id: requestId,
    params: {
      message: {
        role: "user",
        parts: [{ type: "text", text: message }],
      },
      ...(sessionId ? { sessionId } : {}),
    },
  };

  let response: Response;
  try {
    response = await fetch(a2aEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("A2A agent 响应超时（60秒）");
    }
    throw new Error(
      `无法连接到 A2A agent (${normalizedUrl}): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `A2A agent 返回 HTTP ${response.status}: ${body.slice(0, 200)}`,
    );
  }

  let result: Record<string, unknown>;
  try {
    result = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error("A2A agent 返回了无效的 JSON 响应");
  }

  // Handle JSON-RPC error
  if (result.error) {
    const err = result.error as Record<string, unknown>;
    throw new Error(
      `A2A agent 错误: ${err.message || JSON.stringify(err)}`,
    );
  }

  // Extract text from JSON-RPC result
  const rpcResult = result.result as Record<string, unknown> | undefined;
  if (!rpcResult) {
    throw new Error("A2A agent 返回了空结果");
  }

  // The A2A protocol returns artifacts or parts in the result
  let text = "";
  let responseSessionId: string | null = null;

  // Try to extract sessionId from metadata
  const metadata = rpcResult.metadata as Record<string, unknown> | undefined;
  if (metadata?.sessionId && typeof metadata.sessionId === "string") {
    responseSessionId = metadata.sessionId;
  }

  // Extract text from result.message.parts or result.artifacts
  const msg = rpcResult.message as Record<string, unknown> | undefined;
  if (msg?.parts && Array.isArray(msg.parts)) {
    for (const part of msg.parts) {
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
        text += part.text;
      }
    }
  }

  // Fallback: try artifacts array
  if (!text) {
    const artifacts = rpcResult.artifacts as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(artifacts)) {
      for (const artifact of artifacts) {
        const parts = artifact.parts as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (typeof part.text === "string") {
              text += part.text;
            }
          }
        }
      }
    }
  }

  // Last resort: try result.text directly
  if (!text && typeof rpcResult.text === "string") {
    text = rpcResult.text;
  }

  if (!text) {
    throw new Error("A2A agent 返回了空消息");
  }

  // Extract sessionId from task or metadata
  if (!responseSessionId) {
    const task = rpcResult as Record<string, unknown>;
    if (typeof task.sessionId === "string") {
      responseSessionId = task.sessionId;
    }
  }

  return { text, sessionId: responseSessionId };
}
