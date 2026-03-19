/**
 * @jest-environment node
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';

const mockGetSession = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    dateSession: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
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

function makeRequest(id: string) {
  return new NextRequest(`http://localhost/api/dates/${id}/cancel`, {
    method: 'POST',
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/dates/[id]/cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 'u1', accessToken: 'tok' });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const response = await POST(makeRequest('d1'), makeParams('d1'));
    expect(response.status).toBe(401);
  });

  it('returns 404 when date session not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const response = await POST(makeRequest('d1'), makeParams('d1'));
    expect(response.status).toBe(404);
  });

  it('returns 400 when date is already completed', async () => {
    mockFindUnique.mockResolvedValue({ id: 'd1', status: 'completed' });
    const response = await POST(makeRequest('d1'), makeParams('d1'));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('等待中或进行中');
  });

  it('returns 400 when date is already cancelled', async () => {
    mockFindUnique.mockResolvedValue({ id: 'd1', status: 'cancelled' });
    const response = await POST(makeRequest('d1'), makeParams('d1'));
    expect(response.status).toBe(400);
  });

  it('cancels a pending date successfully', async () => {
    mockFindUnique.mockResolvedValue({ id: 'd1', status: 'pending' });
    mockUpdate.mockResolvedValue({ id: 'd1', status: 'cancelled' });
    const response = await POST(makeRequest('d1'), makeParams('d1'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { status: 'cancelled' },
    });
  });

  it('cancels an in_progress date successfully', async () => {
    mockFindUnique.mockResolvedValue({ id: 'd1', status: 'in_progress' });
    mockUpdate.mockResolvedValue({ id: 'd1', status: 'cancelled' });
    const response = await POST(makeRequest('d1'), makeParams('d1'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
