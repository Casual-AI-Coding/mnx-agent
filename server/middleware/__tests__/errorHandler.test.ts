import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { errorHandler } from '../errorHandler.js'

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

function appWithError(statusCode: number): express.Express {
  const app = express()
  app.get('/boom', (_req, res, next) => {
    res.status(statusCode)
    next(new Error('route failed'))
  })
  app.use(errorHandler)
  return app
}

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show 4xx error message in production', () => {
    vi.mocked(isProduction).mockReturnValue(true)
    const req = {} as any
    const res: any = { statusCode: 400, status: vi.fn(() => res), json: vi.fn() }
    const next = vi.fn()
    errorHandler(new Error('Bad request'), req, res, next)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Bad request' })
  })

  it('should hide 5xx error message in production', () => {
    vi.mocked(isProduction).mockReturnValue(true)
    const req = {} as any
    const res: any = { statusCode: 500, status: vi.fn(() => res), json: vi.fn() }
    const next = vi.fn()
    errorHandler(new Error('Server error'), req, res, next)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' })
  })

  it('should show error message in development', () => {
    vi.mocked(isProduction).mockReturnValue(false)
    const req = {} as any
    const res: any = { statusCode: 500, status: vi.fn(() => res), json: vi.fn() }
    const next = vi.fn()
    errorHandler(new Error('Dev error'), req, res, next)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Dev error' })
  })

  it('should default to 500 when statusCode is 200', () => {
    vi.mocked(isProduction).mockReturnValue(false)
    const req = {} as any
    const res: any = { statusCode: 200, status: vi.fn(() => res), json: vi.fn() }
    const next = vi.fn()
    errorHandler(new Error('Unexpected'), req, res, next)
    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('captures 5xx errors for external tracking', async () => {
    vi.mocked(isProduction).mockReturnValue(false)

    await request(appWithError(500)).get('/boom').expect(500)

    expect(captureServerException).toHaveBeenCalledOnce()
  })

  it('does not capture 4xx errors for external tracking', async () => {
    vi.mocked(isProduction).mockReturnValue(false)

    await request(appWithError(400)).get('/boom').expect(400)

    expect(captureServerException).not.toHaveBeenCalled()
  })
})
