import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { asyncHandler } from '../asyncHandler.js'

vi.mock('../../config/index.js', () => ({
  isProduction: vi.fn(() => false),
}))

vi.mock('../../lib/logger', () => ({
  getLogger: () => ({ error: vi.fn() }),
}))

vi.mock('../../lib/error-tracking.js', () => ({
  captureServerException: vi.fn(),
}))

import { isProduction } from '../../config/index.js'
import { captureServerException } from '../../lib/error-tracking.js'

function appWithAsyncError(code: number): express.Express {
  const app = express()
  app.get('/boom', asyncHandler(async () => {
    const err: Error & { code?: number } = new Error('route failed')
    err.code = code
    throw err
  }))
  return app
}

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
    handler(req, res)
    await Promise.resolve()
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
    handler(req, res)
    await Promise.resolve()
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
    handler(req, res)
    await Promise.resolve()
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Dev visible error' })
  })

  it('should default to 500 for errors without code', async () => {
    vi.mocked(isProduction).mockReturnValue(false)
    const req = {} as any
    const res = mockRes()
    const handler = asyncHandler(async () => {
      throw new Error('No code error')
    })
    handler(req, res)
    await Promise.resolve()
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
    handler(req, res)
    await Promise.resolve()
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('captures 5xx errors for external tracking', async () => {
    vi.mocked(isProduction).mockReturnValue(false)

    await request(appWithAsyncError(500)).get('/boom').expect(500)

    expect(captureServerException).toHaveBeenCalledOnce()
  })

  it('does not capture 4xx errors for external tracking', async () => {
    vi.mocked(isProduction).mockReturnValue(false)

    await request(appWithAsyncError(400)).get('/boom').expect(400)

    expect(captureServerException).not.toHaveBeenCalled()
  })
})
