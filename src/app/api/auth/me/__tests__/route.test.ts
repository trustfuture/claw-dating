/**
 * @jest-environment node
 */
import { GET } from '../route';

const mockGetSession = jest.fn();
const mockFindUnique = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}));

jest.mock('@/lib/api-view', () => ({
  serializeAuthPayload: jest.fn((user: { id: string; name: string }) => ({
    user: { id: user.id, name: user.name },
    agent: null,
  })),
}));

jest.mock('@/lib/session-refresh', () => ({
  persistRefreshedSession: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns 404 when user not found in DB', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', accessToken: 'tok' });
    mockFindUnique.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(404);
  });

  it('returns user data when authenticated', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', accessToken: 'tok' });
    mockFindUnique.mockResolvedValue({ id: 'u1', name: 'Alice', agents: [] });
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user).toBeDefined();
    expect(data.user.id).toBe('u1');
  });

  it('returns 500 on database error', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', accessToken: 'tok' });
    mockFindUnique.mockRejectedValue(new Error('DB error'));
    const response = await GET();
    expect(response.status).toBe(500);
  });
});
