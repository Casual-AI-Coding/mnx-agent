import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import {
  auditContextMiddleware,
  getAuditContextInfo,
  getCurrentTraceId,
} from '../audit-context.service.js'

describe('auditContextMiddleware', () => {
  it('生成 traceId 并写入响应头 when 请求没有传入 trace header', async () => {
    const app = express()
    app.use(auditContextMiddleware)
    app.get('/probe', (_req, res) => {
      res.json({ traceId: getCurrentTraceId() })
    })

    const response = await request(app).get('/probe')

    expect(response.status).toBe(200)
    expect(response.headers['x-trace-id']).toMatch(/^[0-9a-f-]{36}$/)
    expect(response.body).toEqual({ traceId: response.headers['x-trace-id'] })
  })

  it('复用客户端 traceId when 请求传入 x-trace-id header', async () => {
    const app = express()
    app.use(auditContextMiddleware)
    app.get('/probe', (_req, res) => {
      res.json(getAuditContextInfo())
    })

    const response = await request(app)
      .get('/probe')
      .set('x-trace-id', 'client-trace-013')

    expect(response.status).toBe(200)
    expect(response.headers['x-trace-id']).toBe('client-trace-013')
    expect(response.body).toEqual({ userId: null, traceId: 'client-trace-013' })
  })

  it('生成 traceId when 请求传入空白 x-trace-id header', async () => {
    const app = express()
    app.use(auditContextMiddleware)
    app.get('/probe', (_req, res) => {
      res.json({ traceId: getCurrentTraceId() })
    })

    const response = await request(app)
      .get('/probe')
      .set('x-trace-id', '   ')

    expect(response.status).toBe(200)
    expect(response.headers['x-trace-id']).toMatch(/^[0-9a-f-]{36}$/)
    expect(response.body).toEqual({ traceId: response.headers['x-trace-id'] })
  })
})
