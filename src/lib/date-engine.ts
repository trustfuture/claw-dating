import { prisma } from "@/lib/db";
import { sendChatMessage, reportAgentMemory } from "@/lib/secondme";

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
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TURNS_PER_AGENT = 5; // 5 turns each = 10 messages total

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseRating(text: string): { score: number; comment: string } {
  const scoreMatch = text.match(/SCORE:\s*(\d+(?:\.\d+)?)/i);
  const commentMatch = text.match(/COMMENT:\s*([\s\S]*)/i);

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
// Main engine
// ---------------------------------------------------------------------------

/**
 * Orchestrate a full date conversation between two SecondMe-backed agents.
 *
 * Flow:
 *  1. Load pairing and both agents (with their owners' SecondMe tokens)
 *  2. Run 5 turns of alternating conversation (10 messages total)
 *  3. Ask each agent to rate the other
 *  4. Persist everything to the database
 */
export async function runDate(
  dateSessionId: string,
  options: RunDateOptions = {},
): Promise<DateResult> {
  // --- Load existing date session + pairing + agents + users -----------------
  const existingSession = await prisma.dateSession.findUniqueOrThrow({
    where: { id: dateSessionId },
    include: { pairing: true },
  });

  const pairing = existingSession.pairing;

  const [agentA, agentB] = await Promise.all([
    prisma.agent.findUniqueOrThrow({
      where: { id: pairing.agentAId },
      include: { user: true },
    }),
    prisma.agent.findUniqueOrThrow({
      where: { id: pairing.agentBId },
      include: { user: true },
    }),
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

  // Chat session IDs for context continuity within each agent's SecondMe
  let sessionIdA: string | null = null;
  let sessionIdB: string | null = null;

  try {
    const tokenA = agentA.user.accessToken;
    const tokenB = agentB.user.accessToken;

    if (!tokenA || !tokenB) {
      throw new Error(
        `Missing SecondMe access token for one or both agents (A: ${agentA.id}, B: ${agentB.id})`,
      );
    }

    // --- Turn 1: Agent A introduces themselves --------------------------------
    const introPrompt = `You're at the 龙虾相亲大会 (Lobster Dating Party)! You've been matched with ${agentB.name}. Please introduce yourself in a fun and charming way. Keep it concise (2-3 sentences).`;

    const introResult = await sendChatMessage(tokenA, introPrompt, sessionIdA ?? undefined);
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

    // --- Turns 2..10: alternating conversation --------------------------------
    let lastMessage = introResult.text;
    let lastSenderName = agentA.name;

    for (let turn = 2; turn <= TURNS_PER_AGENT * 2; turn++) {
      const isAgentATurn = turn % 2 === 1; // odd turns = A, even turns = B
      const currentToken = isAgentATurn ? tokenA : tokenB;
      const currentAgent = isAgentATurn ? agentA : agentB;
      const currentSessionId = isAgentATurn ? sessionIdA : sessionIdB;

      const prompt = `${lastSenderName} says: "${lastMessage}"\n\nPlease respond naturally. Keep it concise (2-3 sentences).`;

      const result = await sendChatMessage(
        currentToken,
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
      sendChatMessage(tokenA, ratingPrompt(agentB.name), sessionIdA ?? undefined),
      sendChatMessage(tokenB, ratingPrompt(agentA.name), sessionIdB ?? undefined),
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

    // --- Persist messages and ratings -----------------------------------------
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

    // --- Report dating memory back to SecondMe (non-blocking) ----------------
    reportDateMemories({
      agentA: { id: agentA.id, name: agentA.name, personalityType: agentA.personalityType, token: tokenA },
      agentB: { id: agentB.id, name: agentB.name, personalityType: agentB.personalityType, token: tokenB },
      messages,
      ratings,
      compatibilityScore: pairing.compatibilityScore,
      dateSessionId: dateSession.id,
    }).catch((err) => {
      console.error("[memory-report] Failed to report date memories:", err);
    });

    return {
      dateSessionId: dateSession.id,
      pairingId: pairing.id,
      messages,
      ratings,
      status: "completed",
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error during date";
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
      console.error("[memory-report] Individual report failed:", result.reason);
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
