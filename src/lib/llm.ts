// ---------------------------------------------------------------------------
// LLM utility – thin wrapper around OpenAI-compatible chat completions API.
// Uses native fetch so we don't need any additional npm dependencies.
// ---------------------------------------------------------------------------

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Returns true if an OpenAI API key is configured in environment variables.
 */
export function isLLMConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-your-key-here";
}

/**
 * Call the OpenAI chat completions endpoint and return the assistant message
 * content. Throws on network or API errors.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: LLMOptions = {},
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "sk-your-key-here") {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = options.model || process.env.LLM_MODEL || "gpt-4o-mini";
  const temperature = options.temperature ?? 0.8;
  const maxTokens = options.maxTokens ?? 256;

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenAI API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI API");
  }

  return content.trim();
}
