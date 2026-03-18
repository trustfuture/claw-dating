/* eslint-disable @typescript-eslint/no-require-imports */
describe('env validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('does not throw when DATABASE_URL is set', () => {
    process.env.DATABASE_URL = 'postgresql://test'
    const { validateEnv } = require('../env')
    expect(() => validateEnv()).not.toThrow()
  })
})
