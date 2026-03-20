/**
 * @jest-environment node
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({
  prisma: {
    event: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    agent: { findMany: jest.fn() },
    a2AAgent: { findMany: jest.fn() },
    pairing: { create: jest.fn() },
    dateSession: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/matchmaker', () => ({
  createPairingsWithLLM: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const { prisma } = require('@/lib/db');
const { createPairingsWithLLM } = require('@/lib/matchmaker');
/* eslint-enable @typescript-eslint/no-require-imports */

const originalEnv = process.env;

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron/daily-event', { headers });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
  delete process.env.CRON_SECRET;
  delete process.env.ENABLE_DAILY_EVENT;

  prisma.event.findFirst.mockResolvedValue(null);
  prisma.agent.findMany.mockResolvedValue([]);
  prisma.a2AAgent.findMany.mockResolvedValue([]);
});

afterAll(() => {
  process.env = originalEnv;
});

describe('GET /api/cron/daily-event', () => {
  describe('authentication', () => {
    it('returns 401 when CRON_SECRET is set but auth header is wrong', async () => {
      process.env.CRON_SECRET = 'secret123';
      const res = await GET(makeRequest({ authorization: 'Bearer wrong' }));
      expect(res.status).toBe(401);
    });

    it('passes auth when CRON_SECRET matches', async () => {
      process.env.CRON_SECRET = 'secret123';
      prisma.agent.findMany.mockResolvedValue([]);
      const res = await GET(makeRequest({ authorization: 'Bearer secret123' }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.skipped).toBe(true);
    });

    it('skips auth when CRON_SECRET is not set', async () => {
      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
    });
  });

  describe('kill switch', () => {
    it('skips when ENABLE_DAILY_EVENT is false', async () => {
      process.env.ENABLE_DAILY_EVENT = 'false';
      const res = await GET(makeRequest());
      const data = await res.json();
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe('disabled');
    });
  });

  describe('idempotency', () => {
    it('skips when today\'s event already exists', async () => {
      prisma.event.findFirst.mockResolvedValueOnce({ id: 'existing', name: '每日相亲 3月20日' });
      const res = await GET(makeRequest());
      const data = await res.json();
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe('already_exists');
      expect(data.eventId).toBe('existing');
    });
  });

  describe('active event check', () => {
    it('skips when there is an active event', async () => {
      prisma.event.findFirst
        .mockResolvedValueOnce(null) // no today's event
        .mockResolvedValueOnce({ id: 'active1', phase: 'dating' }); // active event
      const res = await GET(makeRequest());
      const data = await res.json();
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe('active_event');
    });
  });

  describe('insufficient agents', () => {
    it('skips when 0 agents', async () => {
      prisma.event.findFirst.mockResolvedValue(null);
      prisma.agent.findMany.mockResolvedValue([]);
      prisma.a2AAgent.findMany.mockResolvedValue([]);
      const res = await GET(makeRequest());
      const data = await res.json();
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe('insufficient_agents');
      expect(data.agentCount).toBe(0);
    });

    it('skips when only 1 agent', async () => {
      prisma.event.findFirst.mockResolvedValue(null);
      prisma.agent.findMany.mockResolvedValue([
        { id: 'a1', name: 'Alice', interests: '[]', personalityType: '浪漫', catchphrase: '' },
      ]);
      prisma.a2AAgent.findMany.mockResolvedValue([]);
      const res = await GET(makeRequest());
      const data = await res.json();
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe('insufficient_agents');
      expect(data.agentCount).toBe(1);
    });
  });

  describe('successful creation', () => {
    beforeEach(() => {
      prisma.event.findFirst.mockResolvedValue(null);
      prisma.agent.findMany.mockResolvedValue([
        { id: 'a1', name: 'Alice', interests: '["cooking"]', personalityType: '浪漫', catchphrase: '' },
        { id: 'a2', name: 'Bob', interests: '["travel"]', personalityType: '幽默', catchphrase: '' },
      ]);
      prisma.a2AAgent.findMany.mockResolvedValue([]);
      prisma.event.create.mockResolvedValue({ id: 'evt1', name: '每日相亲' });
      createPairingsWithLLM.mockResolvedValue([
        { agentAId: 'a1', agentBId: 'a2', compatibilityScore: 75, reasoning: '很配' },
      ]);
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          event: { update: jest.fn() },
          pairing: { create: jest.fn().mockResolvedValue({ id: 'p1' }) },
          dateSession: { create: jest.fn() },
        });
      });
    });

    it('creates event and pairings', async () => {
      const res = await GET(makeRequest());
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.created).toBe(true);
      expect(data.agentCount).toBe(2);
      expect(data.pairCount).toBe(1);
      expect(data.durationMs).toBeDefined();
    });
  });

  describe('matchmaking failure', () => {
    it('cleans up event when no pairs generated', async () => {
      prisma.event.findFirst.mockResolvedValue(null);
      prisma.agent.findMany.mockResolvedValue([
        { id: 'a1', name: 'Alice', interests: '[]', personalityType: '', catchphrase: '' },
        { id: 'a2', name: 'Bob', interests: '[]', personalityType: '', catchphrase: '' },
      ]);
      prisma.a2AAgent.findMany.mockResolvedValue([]);
      prisma.event.create.mockResolvedValue({ id: 'evt1' });
      createPairingsWithLLM.mockResolvedValue([]);

      const res = await GET(makeRequest());
      const data = await res.json();
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe('no_pairs');
      expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: 'evt1' } });
    });
  });
});
