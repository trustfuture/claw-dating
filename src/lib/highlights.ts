/**
 * Highlight extraction — uses LLM to pick the most interesting/funny/romantic
 * quotes from a completed date conversation.
 *
 * Called async (fire-and-forget) after a date completes.
 * Failures are logged but never propagate.
 */

import { isLLMConfigured, chatCompletion } from "@/lib/llm";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Highlight {
  quote: string;
  speaker: string;
  category: "funny" | "romantic" | "witty" | "awkward" | "sweet";
}

interface MessageInput {
  senderName: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_MESSAGES_FOR_HIGHLIGHTS = 4;
const MAX_HIGHLIGHTS = 3;

// ---------------------------------------------------------------------------
// Core extraction
// ---------------------------------------------------------------------------

/**
 * Extract highlights from a list of messages using LLM.
 * Returns null if extraction fails or is not possible.
 */
export async function extractHighlights(
  messages: MessageInput[],
): Promise<Highlight[] | null> {
  if (messages.length < MIN_MESSAGES_FOR_HIGHLIGHTS) {
    return null;
  }

  if (!isLLMConfigured()) {
    return null;
  }

  // Build conversation text for the LLM
  const conversation = messages
    .map((m) => `${m.senderName}: "${m.content.slice(0, 200)}"`)
    .join("\n");

  try {
    const result = await chatCompletion(
      [
        {
          role: "system",
          content: `你是龙虾相亲大会的精彩瞬间编辑。从约会对话中挑选最多${MAX_HIGHLIGHTS}个最有趣、最浪漫或最精彩的发言。

回复格式必须是严格的 JSON 数组，每个元素包含:
- quote: 原文引用（不超过80字）
- speaker: 说话人名字
- category: "funny"(搞笑) | "romantic"(浪漫) | "witty"(机智) | "awkward"(尴尬) | "sweet"(甜蜜)

只返回 JSON 数组，不要有任何其他文字。如果没有精彩瞬间，返回空数组 []。`,
        },
        {
          role: "user",
          content: `以下是约会对话，请挑选精彩瞬间：\n\n${conversation}`,
        },
      ],
      { temperature: 0.7, maxTokens: 500 },
    );

    return parseHighlightsResponse(result);
  } catch (err) {
    logger.warn("Highlight extraction LLM call failed", {
      route: "highlights",
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Parse LLM response into validated Highlight array.
 * Returns null if parsing fails.
 */
export function parseHighlightsResponse(raw: string): Highlight[] | null {
  // Try to extract JSON from the response (LLM might wrap in markdown)
  let jsonStr = raw.trim();

  // Strip markdown code fences if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      return null;
    }

    const validCategories = new Set(["funny", "romantic", "witty", "awkward", "sweet"]);

    const highlights: Highlight[] = parsed
      .filter(
        (item: unknown): item is Record<string, unknown> =>
          item !== null &&
          typeof item === "object" &&
          typeof (item as Record<string, unknown>).quote === "string" &&
          typeof (item as Record<string, unknown>).speaker === "string",
      )
      .map((item) => ({
        quote: String(item.quote).slice(0, 200),
        speaker: String(item.speaker).slice(0, 50),
        category: validCategories.has(String(item.category))
          ? (String(item.category) as Highlight["category"])
          : "witty",
      }))
      .slice(0, MAX_HIGHLIGHTS);

    return highlights.length > 0 ? highlights : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Async persistence
// ---------------------------------------------------------------------------

/**
 * Extract and persist highlights for a completed date session.
 * Fire-and-forget — never throws.
 */
export async function extractAndSaveHighlights(
  dateSessionId: string,
): Promise<void> {
  try {
    const session = await prisma.dateSession.findUnique({
      where: { id: dateSessionId },
      include: {
        messages: { orderBy: { turn: "asc" } },
      },
    });

    if (!session || session.status !== "completed") return;
    if (session.highlights) return; // Already extracted

    const messages = session.messages.map((m) => ({
      senderName: m.senderName,
      content: m.content,
    }));

    const highlights = await extractHighlights(messages);
    if (!highlights) return;

    await prisma.dateSession.update({
      where: { id: dateSessionId },
      data: { highlights: JSON.stringify(highlights) },
    });

    logger.info("Highlights extracted", {
      route: "highlights",
      dateSessionId,
      count: highlights.length,
    });
  } catch (err) {
    logger.error("Failed to extract highlights", {
      route: "highlights",
      dateSessionId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
