/**
 * @jest-environment node
 */
import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  prisma: {
    agent: { count: jest.fn().mockResolvedValue(5) },
    a2AAgent: { count: jest.fn().mockResolvedValue(2) },
    event: { count: jest.fn().mockResolvedValue(3) },
    dateSession: { count: jest.fn().mockResolvedValue(10) },
    message: { count: jest.fn().mockResolvedValue(120) },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

describe('GET /api/stats', () => {
  it('returns platform stats', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.totalAgents).toBe(7); // 5 + 2
    expect(data.totalEvents).toBe(3);
    expect(data.totalMessages).toBe(120);
  });

  it('returns zeros on database error', async () => {
    const { prisma } = jest.requireMock('@/lib/db');
    prisma.agent.count.mockRejectedValueOnce(new Error('DB error'));

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.totalAgents).toBe(0);
  });
});
