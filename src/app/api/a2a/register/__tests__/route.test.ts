/**
 * @jest-environment node
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';

const mockGetSession = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    a2AAgent: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}));

jest.mock('@/lib/a2a', () => ({
  validateAgentUrl: jest.fn((url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return parsed.origin + parsed.pathname.replace(/\/+$/, '');
    } catch { return null; }
  }),
  fetchAgentCard: jest.fn().mockResolvedValue({
    name: 'Test Agent',
    description: 'A test agent',
    url: 'https://example.com',
    metadata: {
      personalityType: 'Romantic',
      interests: ['cooking'],
      dealBreakers: [],
      loveLanguage: 'Acts of Service',
      catchphrase: 'Hello',
      avatarEmoji: '🤖',
      nameCn: '测试Agent',
    },
    raw: {},
  }),
}));

jest.mock('@/lib/session-refresh', () => ({
  persistRefreshedSession: jest.fn(),
}));

const mockCheckRateLimitAsync = jest.fn();
jest.mock('@/lib/rate-limit', () => ({
  get checkRateLimitAsync() { return mockCheckRateLimitAsync; },
  RATE_LIMITS: { a2aRegister: {} },
}));

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/a2a/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/a2a/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 'u1', accessToken: 'tok' });
    mockCheckRateLimitAsync.mockResolvedValue({ allowed: true });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const response = await POST(makeRequest({ url: 'https://example.com' }));
    expect(response.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimitAsync.mockResolvedValue({ allowed: false });
    const response = await POST(makeRequest({ url: 'https://example.com' }));
    expect(response.status).toBe(429);
  });

  it('returns 400 when url is missing', async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('url');
  });

  it('returns 400 for invalid URL format', async () => {
    const response = await POST(makeRequest({ url: 'not-a-url' }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('URL');
  });

  it('returns 409 when agent URL already registered', async () => {
    mockFindUnique.mockResolvedValue({ id: 'a1', url: 'https://example.com' });
    const response = await POST(makeRequest({ url: 'https://example.com' }));
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toContain('已注册');
  });

  it('registers a new A2A agent successfully', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 'a-new',
      url: 'https://example.com',
      name: 'Test Agent',
      avatarEmoji: '🤖',
      personalityType: 'Romantic',
      catchphrase: 'Hello',
      status: 'online',
      createdAt: new Date().toISOString(),
    });

    const response = await POST(makeRequest({ url: 'https://example.com' }));
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.agent).toBeDefined();
    expect(data.agent.name).toBe('Test Agent');
  });
});
