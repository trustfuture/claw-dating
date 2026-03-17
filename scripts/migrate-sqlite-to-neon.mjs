import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const SQLITE_PATH = process.env.SQLITE_PATH || "prisma/dev.db";

function readSqliteTable(table) {
  const sql = `SELECT * FROM "${table}";`;
  const output = execFileSync("sqlite3", ["-json", SQLITE_PATH, sql], {
    encoding: "utf8",
  }).trim();

  if (!output) {
    return [];
  }

  return JSON.parse(output);
}

function toDate(value) {
  return value ? new Date(value) : null;
}

function assertTargetDatabase() {
  const target = process.env.DATABASE_URL || "";

  if (!target) {
    throw new Error("缺少 DATABASE_URL，无法导入到 Neon/Postgres。");
  }

  if (!target.startsWith("postgres://") && !target.startsWith("postgresql://")) {
    throw new Error("当前 DATABASE_URL 不是 Postgres 连接串，已中止导入。");
  }
}

function normalizeUsers(rows) {
  return rows.map((row) => ({
    id: row.id,
    secondmeUserId: row.secondmeUserId,
    name: row.name,
    email: row.email ?? null,
    avatarUrl: row.avatarUrl ?? null,
    route: row.route ?? null,
    accessToken: row.accessToken ?? null,
    refreshToken: row.refreshToken ?? null,
    tokenExpiresAt: toDate(row.tokenExpiresAt),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }));
}

function normalizeAgents(rows) {
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    avatarEmoji: row.avatarEmoji ?? "",
    personalityType: row.personalityType ?? "",
    interests: row.interests ?? "[]",
    catchphrase: row.catchphrase ?? "",
    loveLang: row.loveLang ?? "",
    secondmeRoute: row.secondmeRoute ?? "",
    status: row.status ?? "online",
    createdAt: new Date(row.createdAt),
  }));
}

function normalizeEvents(rows) {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phase: row.phase ?? "registration",
    currentRound: Number(row.currentRound ?? 0),
    totalRounds: Number(row.totalRounds ?? 0),
    createdAt: new Date(row.createdAt),
  }));
}

function normalizePairings(rows) {
  return rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    agentAId: row.agentAId,
    agentBId: row.agentBId,
    compatibilityScore:
      row.compatibilityScore === null || row.compatibilityScore === undefined
        ? null
        : Number(row.compatibilityScore),
    reasoning: row.reasoning ?? null,
    round: Number(row.round ?? 0),
  }));
}

function normalizeDateSessions(rows) {
  return rows.map((row) => ({
    id: row.id,
    pairingId: row.pairingId,
    status: row.status ?? "pending",
    round: Number(row.round ?? 0),
    chatSessionId: row.chatSessionId ?? null,
    createdAt: new Date(row.createdAt),
  }));
}

function normalizeMessages(rows) {
  return rows.map((row) => ({
    id: row.id,
    dateSessionId: row.dateSessionId,
    senderId: row.senderId,
    senderName: row.senderName,
    content: row.content,
    turn: Number(row.turn ?? 0),
    createdAt: new Date(row.createdAt),
  }));
}

function normalizeRatings(rows) {
  return rows.map((row) => ({
    id: row.id,
    dateSessionId: row.dateSessionId,
    agentId: row.agentId,
    agentName: row.agentName,
    score: Number(row.score),
    comment: row.comment ?? null,
  }));
}

async function upsertMany(items, handler) {
  for (const item of items) {
    await handler(item);
  }
}

async function main() {
  assertTargetDatabase();

  const localData = {
    users: normalizeUsers(readSqliteTable("User")),
    agents: normalizeAgents(readSqliteTable("Agent")),
    events: normalizeEvents(readSqliteTable("Event")),
    pairings: normalizePairings(readSqliteTable("Pairing")),
    dateSessions: normalizeDateSessions(readSqliteTable("DateSession")),
    messages: normalizeMessages(readSqliteTable("Message")),
    ratings: normalizeRatings(readSqliteTable("Rating")),
  };

  const prisma = new PrismaClient();

  try {
    await upsertMany(localData.users, (user) =>
      prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      }),
    );

    await upsertMany(localData.agents, (agent) =>
      prisma.agent.upsert({
        where: { id: agent.id },
        update: agent,
        create: agent,
      }),
    );

    await upsertMany(localData.events, (event) =>
      prisma.event.upsert({
        where: { id: event.id },
        update: event,
        create: event,
      }),
    );

    await upsertMany(localData.pairings, (pairing) =>
      prisma.pairing.upsert({
        where: { id: pairing.id },
        update: pairing,
        create: pairing,
      }),
    );

    await upsertMany(localData.dateSessions, (dateSession) =>
      prisma.dateSession.upsert({
        where: { id: dateSession.id },
        update: dateSession,
        create: dateSession,
      }),
    );

    await upsertMany(localData.messages, (message) =>
      prisma.message.upsert({
        where: { id: message.id },
        update: message,
        create: message,
      }),
    );

    await upsertMany(localData.ratings, (rating) =>
      prisma.rating.upsert({
        where: { id: rating.id },
        update: rating,
        create: rating,
      }),
    );

    const remoteCounts = {
      User: await prisma.user.count(),
      Agent: await prisma.agent.count(),
      Event: await prisma.event.count(),
      Pairing: await prisma.pairing.count(),
      DateSession: await prisma.dateSession.count(),
      Message: await prisma.message.count(),
      Rating: await prisma.rating.count(),
    };

    console.log(
      JSON.stringify(
        {
          imported: {
            User: localData.users.length,
            Agent: localData.agents.length,
            Event: localData.events.length,
            Pairing: localData.pairings.length,
            DateSession: localData.dateSessions.length,
            Message: localData.messages.length,
            Rating: localData.ratings.length,
          },
          remoteCounts,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
