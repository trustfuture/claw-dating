/**
 * @jest-environment node
 */
import { GET } from '../route';
import { NextRequest } from 'next/server';

const mockGetSession = jest.fn();
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    dateSession: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
    agent: { findMany: (...args: unknown[]) => mockFindMany(...args) },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}));

jest.mock('@/lib/session-refresh', () => ({
  persistRefreshedSession: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/dates/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 'u1', accessToken: 'tok' });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const request = new NextRequest('http://localhost/api/dates/d1');
    const response = await GET(request, makeParams('d1'));
    expect(response.status).toBe(401);
  });

  it('returns 404 when date session not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const request = new NextRequest('http://localhost/api/dates/d1');
    const response = await GET(request, makeParams('d1'));
    expect(response.status).toBe(404);
  });

  it('returns date session with resolved agents', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'd1',
      status: 'completed',
      round: 1,
      createdAt: new Date(),
      pairing: {
        id: 'p1',
        agentAId: 'a1',
        agentBId: 'a2',
        compatibilityScore: 85,
        reasoning: 'Both love food',
        round: 1,
      },
      messages: [
        { id: 'm1', senderId: 'a1', senderName: 'Agent A', content: 'Hello!', turn: 1, createdAt: new Date() },
      ],
      ratings: [
        { agentId: 'a1', agentName: 'Agent A', score: 8, comment: 'Great chat!' },
      ],
    });
    mockFindMany.mockResolvedValue([
      { id: 'a1', name: 'Agent A', avatarEmoji: '🦞', personalityType: 'Romantic' },
      { id: 'a2', name: 'Agent B', avatarEmoji: '🦊', personalityType: 'Adventurer' },
    ]);

    const request = new NextRequest('http://localhost/api/dates/d1');
    const response = await GET(request, makeParams('d1'));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.dateSession).toBeDefined();
    expect(data.dateSession.pairing.agentA.name).toBe('Agent A');
    expect(data.dateSession.pairing.agentB.name).toBe('Agent B');
    expect(data.dateSession.messages).toHaveLength(1);
    expect(data.dateSession.ratings).toHaveLength(1);
  });

  it('uses fallback names for missing agents', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'd1',
      status: 'completed',
      round: 1,
      createdAt: new Date(),
      pairing: {
        id: 'p1',
        agentAId: 'missing1',
        agentBId: 'missing2',
        compatibilityScore: null,
        reasoning: null,
        round: 1,
      },
      messages: [],
      ratings: [],
    });
    mockFindMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/dates/d1');
    const response = await GET(request, makeParams('d1'));
    const data = await response.json();
    expect(data.dateSession.pairing.agentA.name).toBe('神秘嘉宾');
    expect(data.dateSession.pairing.agentB.name).toBe('神秘嘉宾');
  });
});
