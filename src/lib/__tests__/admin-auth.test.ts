/**
 * @jest-environment node
 */
import { requireAdmin } from '../admin-auth'

// Mock getSession
jest.mock('../auth', () => ({
  getSession: jest.fn(),
}))

import { getSession } from '../auth'
const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>

describe('requireAdmin', () => {
  it('returns 401 error when not logged in', async () => {
    mockedGetSession.mockResolvedValue(null)
    const { session, error } = await requireAdmin()
    expect(session).toBeNull()
    expect(error).not.toBeNull()
    const data = await error!.json()
    expect(data.error).toBeDefined()
  })

  it('returns 403 error when not admin', async () => {
    mockedGetSession.mockResolvedValue({
      userId: 'user1',
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() / 1000 + 3600,
      role: 'user',
    })
    const { error } = await requireAdmin()
    expect(error).not.toBeNull()
    // Check status is 403
    expect(error!.status).toBe(403)
  })

  it('returns session when admin', async () => {
    mockedGetSession.mockResolvedValue({
      userId: 'admin1',
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() / 1000 + 3600,
      role: 'admin',
    })
    const { session, error } = await requireAdmin()
    expect(error).toBeNull()
    expect(session).not.toBeNull()
    expect(session!.userId).toBe('admin1')
  })
})
