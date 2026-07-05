import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { handleApiError } from '../errorHandler'

vi.mock('../../lib/error-tracking.js', () => ({
  captureServerException: vi.fn(),
}))

import { captureServerException } from '../../lib/error-tracking.js'

describe('handleApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fall back to a generic message for non-Error values', async () => {
    const app = express()
    app.get('/plain', (req, res) => {
      handleApiError(req, res, 'plain-string-error')
    })

    const response = await request(app).get('/plain').expect(500)

    expect(response.body).toEqual({
      success: false,
      error: 'Unknown error',
    })
  })

  it('captures non-Error 5xx values from explicit catch paths', async () => {
    const app = express()
    app.get('/plain', (req, res) => {
      handleApiError(req, res, 'plain-string-error')
    })

    await request(app).get('/plain').expect(500)

    expect(captureServerException).toHaveBeenCalledWith(new Error('Unknown error'), {
      method: 'GET',
      path: '/plain',
      statusCode: 500,
      traceId: undefined,
      userId: undefined,
    })
  })

  it('captures 5xx errors from explicit catch paths', async () => {
    const app = express()
    const error = new Error('external api failed')
    app.get('/boom', (req, res) => {
      handleApiError(req, res, error)
    })

    await request(app).get('/boom').expect(500)

    expect(captureServerException).toHaveBeenCalledWith(error, {
      method: 'GET',
      path: '/boom',
      statusCode: 500,
      traceId: undefined,
      userId: undefined,
    })
  })

  it('does not capture 4xx errors from explicit catch paths', async () => {
    const app = express()
    const error: Error & { code?: number } = new Error('not found')
    error.code = 404
    app.get('/missing', (req, res) => {
      handleApiError(req, res, error)
    })

    await request(app).get('/missing').expect(404)

    expect(captureServerException).not.toHaveBeenCalled()
  })
})
