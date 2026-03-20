/**
 * @jest-environment node
 */

import { POST, GET } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    dateSession: {
      findUnique: jest.fn(),
    },
    vote: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 29 }),
  RATE_LIMITS: {},
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const { prisma } = require('@/lib/db');
const { getSession } = require('@/lib/auth');
const { checkRateLimit } = require('@/lib/rate-limit');
/* eslint-enable @typescript-eslint/no-require-imports */

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/dates/ds1/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: 'ds1' });

describe('POST /api/dates/[id]/vote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSession.mockResolvedValue({ userId: 'user1' });
    checkRateLimit.mockReturnValue({ allowed: true, remaining: 29 });
    prisma.dateSession.findUnique.mockResolvedValue({ id: 'ds1', status: 'in_progress' });
    prisma.vote.upsert.mockResolvedValue({ id: 'v1', voteType: 'chemistry' });
    prisma.vote.count.mockResolvedValue(1);
  });

  it('creates a vote successfully', async () => {
    const res = await POST(makeRequest({ voteType: 'chemistry' }), { params });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.vote.voteType).toBe('chemistry');
    expect(data.counts).toBeDefined();
  });

  it('returns 401 when not logged in', async () => {
    getSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ voteType: 'chemistry' }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    checkRateLimit.mockReturnValue({ allowed: false, remaining: 0 });
    const res = await POST(makeRequest({ voteType: 'chemistry' }), { params });
    expect(res.status).toBe(429);
  });

  it('returns 400 for invalid vote type', async () => {
    const res = await POST(makeRequest({ voteType: 'invalid' }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing vote type', async () => {
    const res = await POST(makeRequest({}), { params });
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent date session', async () => {
    prisma.dateSession.findUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ voteType: 'chemistry' }), { params });
    expect(res.status).toBe(404);
  });

  it('accepts not_feeling_it vote type', async () => {
    prisma.vote.upsert.mockResolvedValue({ id: 'v2', voteType: 'not_feeling_it' });
    const res = await POST(makeRequest({ voteType: 'not_feeling_it' }), { params });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.vote.voteType).toBe('not_feeling_it');
  });
});

describe('GET /api/dates/[id]/vote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.vote.count.mockResolvedValue(0);
  });

  it('returns counts without auth', async () => {
    getSession.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/dates/ds1/vote');
    const res = await GET(req, { params });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.counts).toBeDefined();
    expect(data.userVote).toBeNull();
  });

  it('returns userVote when logged in', async () => {
    getSession.mockResolvedValue({ userId: 'user1' });
    prisma.vote.findUnique.mockResolvedValue({ voteType: 'chemistry' });
    const req = new NextRequest('http://localhost/api/dates/ds1/vote');
    const res = await GET(req, { params });
    const data = await res.json();
    expect(data.userVote).toBe('chemistry');
  });
});
