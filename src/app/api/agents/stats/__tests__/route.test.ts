/**
 * @jest-environment node
 */
import { GET } from '../route';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    rating: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

const mockedPrisma = prisma as unknown as { rating: { findMany: jest.Mock } };

describe('GET /api/agents/stats', () => {
  it('returns empty stats when no ratings', async () => {
    const response = await GET();
    const data = await response.json();
    expect(data).toHaveProperty('stats');
    expect(data.stats).toEqual({});
  });

  it('computes stats from ratings', async () => {
    mockedPrisma.rating.findMany.mockResolvedValue([
      {
        agentId: 'agentA',
        agentName: 'Agent A',
        score: 8,
        dateSession: { pairing: { agentAId: 'agentA', agentBId: 'agentB' } },
      },
      {
        agentId: 'agentB',
        agentName: 'Agent B',
        score: 9,
        dateSession: { pairing: { agentAId: 'agentA', agentBId: 'agentB' } },
      },
    ]);

    const response = await GET();
    const data = await response.json();
    // agentA rated 8, so agentB received 8
    // agentB rated 9, so agentA received 9
    expect(data.stats.agentA.avgRating).toBe(9);
    expect(data.stats.agentB.avgRating).toBe(8);
    expect(data.stats.agentA.totalDates).toBe(1);
    expect(data.stats.agentB.totalDates).toBe(1);
  });
});
