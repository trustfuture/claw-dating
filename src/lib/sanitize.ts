/**
 * Input sanitization and validation for agent data.
 */

/** Strip HTML tags, trim whitespace, and truncate to maxLength. */
export function sanitizeString(input: unknown, maxLength = 200): string {
  if (typeof input !== "string") return "";
  return input.replace(/<[^>]*>/g, "").trim().slice(0, maxLength);
}

interface AgentInput {
  name?: unknown;
  personalityType?: unknown;
  interests?: unknown;
  catchphrase?: unknown;
  avatarEmoji?: unknown;
}

interface ValidatedAgentInput {
  name: string;
  personalityType: string;
  interests: string[];
  catchphrase: string;
  avatarEmoji: string;
}

type ValidationResult =
  | { ok: true; data: ValidatedAgentInput }
  | { ok: false; error: string };

/** Validate and sanitize agent creation/update input. */
export function validateAgentInput(
  data: AgentInput,
  partial = false,
): ValidationResult {
  const name = sanitizeString(data.name, 20);
  if (!partial && (!name || name.length < 2)) {
    return { ok: false, error: "名字需要 2-20 个字符" };
  }
  if (partial && data.name !== undefined && name.length < 2) {
    return { ok: false, error: "名字需要 2-20 个字符" };
  }

  const personalityType = sanitizeString(data.personalityType, 30);
  const catchphrase = sanitizeString(data.catchphrase, 50);
  const avatarEmoji = sanitizeString(data.avatarEmoji, 10);

  // Validate interests
  let interests: string[] = [];
  if (Array.isArray(data.interests)) {
    interests = data.interests
      .filter((i): i is string => typeof i === "string")
      .map((i) => sanitizeString(i, 20))
      .filter((i) => i.length > 0)
      .slice(0, 10);
  }

  return {
    ok: true,
    data: { name, personalityType, interests, catchphrase, avatarEmoji },
  };
}
