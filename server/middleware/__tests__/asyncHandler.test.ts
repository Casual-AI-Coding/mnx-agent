import { describe, it, expect, vi, beforeEach } from 'vitest'
import { asyncHandler } from '../asyncHandler.js'

vi.mock('../../config/index.js', () => ({
  isProduction: vi.fn(() => false),
}))

import { isProduction } from '../../config/index.js'

function mockRes() {
  const res: Record<string, unknown> = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  return res as any
}

describe('asyncHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 4xx error message in production', async () => {
    vi.mocked(isProduction).mockReturnValue(true)
    const req = {} as any
    const res = mockRes()
    const handler = asyncHandler(async () => {
      const err: Error & { code?: number } = new Error('Invalid input')
      err.code = 400
      throw err
    })
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Invalid input' })
  })

  it('should hide 5xx error message in production', async () => {
    vi.mocked(isProduction).mockReturnValue(true)
    const req = {} as any
    const res = mockRes()
    const handler = asyncHandler(async () => {
      const err: Error & { code?: number } = new Error('DB connection failed')
      err.code = 500
      throw err
    })
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' })
  })

  it('should show error message in development', async () => {
    vi.mocked(isProduction).mockReturnValue(false)
    const req = {} as any
    const res = mockRes()
    const handler = asyncHandler(async () => {
      const err: Error & { code?: number } = new Error('Dev visible error')
      err.code = 500
      throw err
    })
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Dev visible error' })
  })

  it('should default to 500 for errors without code', async () => {
    vi.mocked(isProduction).mockReturnValue(false)
    const req = {} as any
    const res = mockRes()
    const handler = asyncHandler(async () => {
      throw new Error('No code error')
    })
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('should set correct status code from error.code', async () => {
    vi.mocked(isProduction).mockReturnValue(false)
    const req = {} as any
    const res = mockRes()
    const handler = asyncHandler(async () => {
      const err: Error & { code?: number } = new Error('Not found')
      err.code = 404
      throw err
    })
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })
})
