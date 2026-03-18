/**
 * @jest-environment node
 */
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    agent: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue(null),
}));

// Mock secondme
jest.mock('@/lib/secondme', () => ({
  fetchUserShades: jest.fn().mockResolvedValue([]),
}));

// Mock api-view
jest.mock('@/lib/api-view', () => ({
  serializeAgent: jest.fn((agent: unknown) => agent),
}));

// Mock session-refresh
jest.mock('@/lib/session-refresh', () => ({
  persistRefreshedSession: jest.fn(),
}));

// Mock sanitize
jest.mock('@/lib/sanitize', () => ({
  validateAgentInput: jest.fn(),
}));

// Mock rate-limit
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
  checkRateLimitAsync: jest.fn().mockResolvedValue({ allowed: true }),
  RATE_LIMITS: { agentCreate: {} },
}));

describe('GET /api/agents', () => {
  it('returns agents array', async () => {
    const request = new NextRequest('http://localhost/api/agents');
    const response = await GET(request);
    const data = await response.json();

    expect(data).toHaveProperty('agents');
    expect(Array.isArray(data.agents)).toBe(true);
  });

  it('returns pagination metadata', async () => {
    const request = new NextRequest('http://localhost/api/agents');
    const response = await GET(request);
    const data = await response.json();

    expect(data).toHaveProperty('next_cursor');
    expect(data).toHaveProperty('has_more');
    expect(data.has_more).toBe(false);
  });
});
