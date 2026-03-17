/**
 * A2A (Agent-to-Agent) protocol utilities.
 *
 * Handles fetching and parsing Agent Cards from external A2A-compatible agents.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
