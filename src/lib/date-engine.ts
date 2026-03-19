import { prisma } from "@/lib/db";
import { sendChatMessage, reportAgentMemory } from "@/lib/secondme";
import { sendA2AMessage } from "@/lib/a2a";
import { EVENT_LIMITS } from "@/lib/constants";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateMessage {
  senderId: string;
  senderName: string;
  content: string;
  turn: number;
}

export interface AgentRating {
  agentId: string;
  agentName: string;
  score: number;
  comment: string;
}

export interface DateResult {
  dateSessionId: string;
  pairingId: string;
  messages: DateMessage[];
  ratings: AgentRating[];
  status: "completed" | "error";
  error?: string;
}

export interface RunDateOptions {
  onMessage?: (message: DateMessage) => void | Promise<void>;
  onRatings?: (ratings: AgentRating[]) => void | Promise<void>;
  turnsPerAgent?: number; // defaults to 5
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TURNS_PER_AGENT = EVENT_LIMITS.DEFAULT_TURNS_PER_AGENT;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError.message.includes('401') || lastError.message.includes('403') || lastError.message.includes('未授权')) {
        throw lastError;
      }
      if (attempt < maxRetries) {
        const jitter = Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt) + jitter));
      }
    }
  }
  throw lastError;
}

function parseRating(text: string): { score: number; comment: string } {
  const scoreMatch = text.match(/SCORE:\s*(\d+(?:\.\d+)?)/i);
  const commentMatch = text.match(/COMMENT:\s*([\s\S]*)/i);

  if (!scoreMatch) {
    logger.warn("Rating parse failed, using default 5", { route: "date-engine", text: text.slice(0, 100) });
  }

  const score = scoreMatch ? Math.min(10, Math.max(1, parseFloat(scoreMatch[1]))) : 5;
  const comment = commentMatch ? commentMatch[1].trim() : text.trim();

  return { score, comment };
}

async function updateEventPhaseIfFinished(eventId: string) {
  const remainingActiveSessions = await prisma.dateSession.count({
    where: {
      status: {
        in: ["pending", "in_progress"],
      },
      pairing: {
        is: {
          eventId,
        },
      },
    },
  });

  if (remainingActiveSessions === 0) {
    await prisma.event.update({
      where: { id: eventId },
      data: { phase: "results" },
    });
  }
}

// ---------------------------------------------------------------------------
// Agent channel abstraction
// ---------------------------------------------------------------------------

/**
 * Represents a resolved agent with its messaging channel info.
 * Either SecondMe (has token) or A2A (has a2aUrl).
 */
interface ResolvedAgent {
  id: string;
  name: string;
  personalityType: string;
  channel: "secondme" | "a2a";
  token?: string;      // SecondMe access token
  a2aUrl?: string;     // A2A endpoint URL
}

/**
 * Resolve an agent from the database, determining whether it's a SecondMe or A2A agent.
 */
async function resolveAgent(agentId: string): Promise<ResolvedAgent> {
  // Try SecondMe agent first
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { user: true },
  });

  if (agent) {
    return {
      id: agent.id,
      name: agent.name,
      personalityType: agent.personalityType,
      channel: "secondme",
      token: agent.user.accessToken ?? undefined,
    };
  }

  // Try A2A agent
  const a2aAgent = await prisma.a2AAgent.findUnique({
    where: { id: agentId },
  });

  if (a2aAgent) {
    return {
      id: a2aAgent.id,
      name: a2aAgent.name,
      personalityType: a2aAgent.personalityType,
      channel: "a2a",
      a2aUrl: a2aAgent.url,
    };
  }

  throw new Error(`Agent ${agentId} not found`);
}

/**
 * Send a message to an agent via its appropriate channel.
 */
async function sendMessageToAgent(
  agent: ResolvedAgent,
  message: string,
  sessionId?: string,
): Promise<{ text: string; sessionId: string | null }> {
  if (agent.channel === "secondme") {
    if (!agent.token) {
      throw new Error(`${agent.name} 的 SecondMe 未授权，请重新登录`);
    }
    return withRetry(() => sendChatMessage(agent.token!, message, sessionId));
  }

  if (agent.channel === "a2a") {
    if (!agent.a2aUrl) {
      throw new Error(`${agent.name} 的 A2A URL 未配置`);
    }
    return withRetry(() => sendA2AMessage(agent.a2aUrl!, message, sessionId));
  }

  throw new Error(`Unknown agent channel: ${agent.channel}`);
}

// ---------------------------------------------------------------------------
// Main engine
// ---------------------------------------------------------------------------

/**
 * Orchestrate a full date conversation between two agents.
 * Supports SecondMe agents, A2A agents, and mixed pairings.
 *
 * Flow:
 *  1. Load pairing and resolve both agents (SecondMe or A2A)
 *  2. Run 5 turns of alternating conversation (10 messages total)
 *  3. Ask each agent to rate the other
 *  4. Persist everything to the database
 */
export async function runDate(
  dateSessionId: string,
  options: RunDateOptions = {},
): Promise<DateResult> {
  // --- Load existing date session + pairing -----------------
  const existingSession = await prisma.dateSession.findUniqueOrThrow({
    where: { id: dateSessionId },
    include: { pairing: true },
  });

  const pairing = existingSession.pairing;

  // Resolve agents (supports both SecondMe and A2A)
  const [agentA, agentB] = await Promise.all([
    resolveAgent(pairing.agentAId),
    resolveAgent(pairing.agentBId),
  ]);

  const dateSession = await prisma.$transaction(async (tx) => {
    await tx.message.deleteMany({
      where: { dateSessionId: existingSession.id },
    });
    await tx.rating.deleteMany({
      where: { dateSessionId: existingSession.id },
    });

    return tx.dateSession.update({
      where: { id: existingSession.id },
      data: {
        status: "in_progress",
      },
    });
  });

  const messages: DateMessage[] = [];
  const errors: string[] = [];

  // Chat session IDs for context continuity
  let sessionIdA: string | null = null;
  let sessionIdB: string | null = null;

  try {
    // --- Turn 1: Agent A introduces themselves --------------------------------
    const introPrompt = `You're at the 龙虾相亲大会 (Lobster Dating Party)! You've been matched with ${agentB.name}. Please introduce yourself in a fun and charming way. Keep it concise (2-3 sentences).`;

    const introResult = await sendMessageToAgent(agentA, introPrompt, sessionIdA ?? undefined);
    sessionIdA = introResult.sessionId ?? sessionIdA;

    const firstMsg: DateMessage = {
      senderId: agentA.id,
      senderName: agentA.name,
      content: introResult.text,
      turn: 1,
    };
    messages.push(firstMsg);
    await prisma.message.create({
      data: {
        dateSessionId: dateSession.id,
        senderId: firstMsg.senderId,
        senderName: firstMsg.senderName,
        content: firstMsg.content,
        turn: firstMsg.turn,
      },
    });
    await options.onMessage?.(firstMsg);

    // --- Turns 2..N: alternating conversation --------------------------------
    const turnsPerAgent = Math.min(Math.max(options.turnsPerAgent ?? DEFAULT_TURNS_PER_AGENT, 2), 10);
    let lastMessage = introResult.text;
    let lastSenderName = agentA.name;

    for (let turn = 2; turn <= turnsPerAgent * 2; turn++) {
      const isAgentATurn = turn % 2 === 1; // odd turns = A, even turns = B
      const currentAgent = isAgentATurn ? agentA : agentB;
      const currentSessionId = isAgentATurn ? sessionIdA : sessionIdB;

      const prompt = `${lastSenderName} says: "${lastMessage}"\n\nPlease respond naturally. Keep it concise (2-3 sentences).`;

      const result = await sendMessageToAgent(
        currentAgent,
        prompt,
        currentSessionId ?? undefined,
      );

      if (isAgentATurn) {
        sessionIdA = result.sessionId ?? sessionIdA;
      } else {
        sessionIdB = result.sessionId ?? sessionIdB;
      }

      const msg: DateMessage = {
        senderId: currentAgent.id,
        senderName: currentAgent.name,
        content: result.text,
        turn,
      };
      messages.push(msg);
      await prisma.message.create({
        data: {
          dateSessionId: dateSession.id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          content: msg.content,
          turn: msg.turn,
        },
      });
      await options.onMessage?.(msg);

      lastMessage = result.text;
      lastSenderName = currentAgent.name;
    }

    // --- Rating phase ---------------------------------------------------------
    const ratingPrompt = (otherName: string) =>
      `The date with ${otherName} is over! Please rate your experience on a scale of 1 to 10. Reply in EXACTLY this format:\nSCORE: <number>\nCOMMENT: <your thoughts about the date>`;

    const [ratingResultA, ratingResultB] = await Promise.all([
      sendMessageToAgent(agentA, ratingPrompt(agentB.name), sessionIdA ?? undefined),
      sendMessageToAgent(agentB, ratingPrompt(agentA.name), sessionIdB ?? undefined),
    ]);

    const parsedA = parseRating(ratingResultA.text);
    const parsedB = parseRating(ratingResultB.text);

    const ratings: AgentRating[] = [
      {
        agentId: agentA.id,
        agentName: agentA.name,
        score: parsedA.score,
        comment: parsedA.comment,
      },
      {
        agentId: agentB.id,
        agentName: agentB.name,
        score: parsedB.score,
        comment: parsedB.comment,
      },
    ];

    // --- Persist ratings -----------------------------------------
    await prisma.$transaction([
      ...ratings.map((r) =>
        prisma.rating.create({
          data: {
            dateSessionId: dateSession.id,
            agentId: r.agentId,
            agentName: r.agentName,
            score: r.score,
            comment: r.comment,
          },
        }),
      ),
      prisma.dateSession.update({
        where: { id: dateSession.id },
        data: { status: "completed" },
      }),
    ]);
    await options.onRatings?.(ratings);

    await updateEventPhaseIfFinished(pairing.eventId);

    // --- Report dating memory back to SecondMe (non-blocking, only for SecondMe agents) ---
    const memoryAgents: { self: MemoryAgent; partner: MemoryAgent }[] = [];
    if (agentA.channel === "secondme" && agentA.token) {
      memoryAgents.push({
        self: { id: agentA.id, name: agentA.name, personalityType: agentA.personalityType, token: agentA.token },
        partner: { id: agentB.id, name: agentB.name, personalityType: agentB.personalityType, token: "" },
      });
    }
    if (agentB.channel === "secondme" && agentB.token) {
      memoryAgents.push({
        self: { id: agentB.id, name: agentB.name, personalityType: agentB.personalityType, token: agentB.token },
        partner: { id: agentA.id, name: agentA.name, personalityType: agentA.personalityType, token: "" },
      });
    }

    if (memoryAgents.length > 0) {
      reportDateMemoriesSelective({
        agents: memoryAgents,
        messages,
        ratings,
        compatibilityScore: pairing.compatibilityScore,
        dateSessionId: dateSession.id,
      }).catch((err) => {
        logger.error("Failed to report date memories", { route: "date-engine", error: err instanceof Error ? err.message : String(err) });
      });
    }

    return {
      dateSessionId: dateSession.id,
      pairingId: pairing.id,
      messages,
      ratings,
      status: "completed",
    };
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : "Unknown error during date";
    const turn = messages.length;
    let errorMessage = rawMessage;
    if (rawMessage.includes("超时")) {
      errorMessage = turn > 0
        ? `在第 ${turn} 轮对话时响应超时`
        : "Agent 响应超时，请稍后重试";
    } else if (rawMessage.includes("fetch") || rawMessage.includes("network") || rawMessage.includes("ECONNREFUSED")) {
      errorMessage = turn > 0
        ? `在第 ${turn} 轮对话时网络中断`
        : "网络连接失败，请检查网络后重试";
    }
    errors.push(errorMessage);

    // Persist whatever we have so far
    await prisma.dateSession.update({
      where: { id: dateSession.id },
      data: { status: "error" },
    });

    await updateEventPhaseIfFinished(pairing.eventId);

    return {
      dateSessionId: dateSession.id,
      pairingId: pairing.id,
      messages,
      ratings: [],
      status: "error",
      error: errorMessage,
    };
  }
}

// ---------------------------------------------------------------------------
// Memory reporting
// ---------------------------------------------------------------------------

interface MemoryAgent {
  id: string;
  name: string;
  personalityType: string;
  token: string;
}

interface ReportDateMemoriesInput {
  agentA: MemoryAgent;
  agentB: MemoryAgent;
  messages: DateMessage[];
  ratings: AgentRating[];
  compatibilityScore: number | null;
  dateSessionId: string;
}

/**
 * Build a memory summary string for one agent about their date.
 */
function buildMemorySummary(
  self: MemoryAgent,
  partner: MemoryAgent,
  messages: DateMessage[],
  ratings: AgentRating[],
  compatibilityScore: number | null,
): string {
  const selfRating = ratings.find((r) => r.agentId === self.id);
  const partnerRating = ratings.find((r) => r.agentId === partner.id);

  // Pick up to 3 notable messages from each side for highlights
  const highlights = messages
    .filter((m) => m.content.trim().length > 0)
    .slice(0, 6)
    .map((m) => `  ${m.senderName}: "${m.content.slice(0, 120)}"`)
    .join("\n");

  const lines: string[] = [
    `Date at the Lobster Dating Party (龙虾相亲大会)`,
    `Partner: ${partner.name} (${partner.personalityType || "unknown type"})`,
    ``,
    `Conversation highlights:`,
    highlights,
    ``,
  ];

  if (compatibilityScore != null) {
    lines.push(`Compatibility score: ${compatibilityScore.toFixed(1)}/10`);
  }

  if (selfRating) {
    lines.push(
      `My rating: ${selfRating.score}/10 - ${selfRating.comment ?? ""}`,
    );
  }

  if (partnerRating) {
    lines.push(
      `${partner.name}'s rating: ${partnerRating.score}/10 - ${partnerRating.comment ?? ""}`,
    );
  }

  return lines.join("\n");
}

/**
 * Report dating memories back to SecondMe for both agents.
 * This is fire-and-forget; failures are logged but do not propagate.
 */
async function reportDateMemories(
  input: ReportDateMemoriesInput,
): Promise<void> {
  const { agentA, agentB, messages, ratings, compatibilityScore, dateSessionId } = input;

  const reportOne = async (self: MemoryAgent, partner: MemoryAgent) => {
    const summary = buildMemorySummary(self, partner, messages, ratings, compatibilityScore);

    await reportAgentMemory(self.token, {
      source: "claw-dating",
      type: "dating_experience",
      dateSessionId,
      partnerName: partner.name,
      partnerPersonalityType: partner.personalityType,
      content: summary,
    });
  };

  const results = await Promise.allSettled([
    reportOne(agentA, agentB),
    reportOne(agentB, agentA),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      logger.error("Individual memory report failed", { route: "date-engine", error: result.reason instanceof Error ? result.reason.message : String(result.reason) });
    }
  }
}

/**
 * Selective memory reporting — only for SecondMe agents that have tokens.
 * Used when a date involves A2A agents that don't support SecondMe memory.
 */
interface SelectiveMemoryInput {
  agents: { self: MemoryAgent; partner: MemoryAgent }[];
  messages: DateMessage[];
  ratings: AgentRating[];
  compatibilityScore: number | null;
  dateSessionId: string;
}

async function reportDateMemoriesSelective(
  input: SelectiveMemoryInput,
): Promise<void> {
  const { agents, messages, ratings, compatibilityScore, dateSessionId } = input;

  const results = await Promise.allSettled(
    agents.map(async ({ self, partner }) => {
      const summary = buildMemorySummary(self, partner, messages, ratings, compatibilityScore);
      await reportAgentMemory(self.token, {
        source: "claw-dating",
        type: "dating_experience",
        dateSessionId,
        partnerName: partner.name,
        partnerPersonalityType: partner.personalityType,
        content: summary,
      });
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      logger.error("Individual memory report failed", { route: "date-engine", error: result.reason instanceof Error ? result.reason.message : String(result.reason) });
    }
  }
}

/**
 * Report dating memory for a completed date session (used by the API endpoint).
 * Loads all necessary data from the database and sends memory to SecondMe.
 */
export async function reportDateMemoryForSession(
  dateSessionId: string,
): Promise<{ reported: boolean; error?: string }> {
  const session = await prisma.dateSession.findUnique({
    where: { id: dateSessionId },
    include: {
      pairing: true,
      messages: { orderBy: { turn: "asc" } },
      ratings: true,
    },
  });

  if (!session) {
    return { reported: false, error: "Date session not found" };
  }

  if (session.status !== "completed") {
    return { reported: false, error: "Date session is not completed" };
  }

  const [agentA, agentB] = await Promise.all([
    prisma.agent.findUnique({
      where: { id: session.pairing.agentAId },
      include: { user: true },
    }),
    prisma.agent.findUnique({
      where: { id: session.pairing.agentBId },
      include: { user: true },
    }),
  ]);

  if (!agentA?.user.accessToken || !agentB?.user.accessToken) {
    return { reported: false, error: "Missing access token for one or both agents" };
  }

  const messages: DateMessage[] = session.messages.map((m) => ({
    senderId: m.senderId,
    senderName: m.senderName,
    content: m.content,
    turn: m.turn,
  }));

  const ratings: AgentRating[] = session.ratings.map((r) => ({
    agentId: r.agentId,
    agentName: r.agentName,
    score: r.score,
    comment: r.comment ?? "",
  }));

  await reportDateMemories({
    agentA: {
      id: agentA.id,
      name: agentA.name,
      personalityType: agentA.personalityType,
      token: agentA.user.accessToken,
    },
    agentB: {
      id: agentB.id,
      name: agentB.name,
      personalityType: agentB.personalityType,
      token: agentB.user.accessToken,
    },
    messages,
    ratings,
    compatibilityScore: session.pairing.compatibilityScore,
    dateSessionId: session.id,
  });

  return { reported: true };
}
