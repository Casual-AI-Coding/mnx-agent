import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { auditContextMiddleware } from '../../services/audit-context.service.js'
import { requestLogger } from '../logger-middleware.js'

const info = vi.fn()

vi.mock('../../lib/logger.js', () => ({
  getLogger: () => ({ info }),
}))

describe('requestLogger', () => {
  it('记录请求日志携带 traceId when audit context 已建立', async () => {
    info.mockClear()
    const app = express()
    app.use(auditContextMiddleware)
    app.use(requestLogger)
    app.get('/probe', (_req, res) => {
      res.json({ ok: true })
    })

    const response = await request(app)
      .get('/probe')
      .set('x-trace-id', 'trace-log-013')

    expect(response.status).toBe(200)
    expect(info).toHaveBeenCalledWith(expect.objectContaining({
      type: 'request',
      traceId: 'trace-log-013',
    }))
    expect(info).toHaveBeenCalledWith(expect.objectContaining({
      type: 'response',
      traceId: 'trace-log-013',
    }))
  })
})
