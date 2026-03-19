/**
 * @jest-environment node
 */
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
const mockGetSession = jest.fn();
const mockFindFirst = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    event: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}));

jest.mock('@/lib/api-view', () => ({
  getLatestEventView: jest.fn().mockResolvedValue(null),
  getAllEventSummaries: jest.fn().mockResolvedValue([]),
  getEventViewById: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/session-refresh', () => ({
  persistRefreshedSession: jest.fn(),
}));

const mockCheckRateLimit = jest.fn();
jest.mock('@/lib/rate-limit', () => ({
  get checkRateLimit() { return mockCheckRateLimit; },
  RATE_LIMITS: { eventCreate: {} },
}));

jest.mock('@/lib/sanitize', () => ({
  sanitizeString: jest.fn((s: string) => (typeof s === 'string' ? s.trim().slice(0, 50) : '')),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

describe('GET /api/events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const request = new NextRequest('http://localhost/api/events');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns event null when no active event', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', accessToken: 'tok' });
    const request = new NextRequest('http://localhost/api/events');
    const response = await GET(request);
    const data = await response.json();
    expect(data.event).toBeNull();
  });
});

describe('POST /api/events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 'u1', accessToken: 'tok' });
    mockCheckRateLimit.mockReturnValue({ allowed: true });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Event' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 when active event exists', async () => {
    mockFindFirst.mockResolvedValue({ id: 'e1', phase: 'dating' });
    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Event' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('正在进行');
  });

  it('creates event when no active event', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 'e-new',
      name: 'Test Event',
      phase: 'registration',
      currentRound: 0,
      totalRounds: 2,
      turnsPerAgent: 5,
    });

    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Event', totalRounds: 2 }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it('allows creation when previous event is completed', async () => {
    mockFindFirst.mockResolvedValue({ id: 'e1', phase: 'completed' });
    mockCreate.mockResolvedValue({
      id: 'e-new',
      name: 'New Event',
      phase: 'registration',
      currentRound: 0,
      totalRounds: 2,
      turnsPerAgent: 5,
    });

    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Event' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it('rate limits event creation', async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false });

    const request = new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(429);
  });
});
