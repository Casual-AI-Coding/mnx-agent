import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import {
  setupTestDatabase,
  teardownTestDatabase,
  getConnection,
  getTestFileMarker,
} from '../../__tests__/test-helpers.js'
import externalApiLogsRouter from '../external-api-logs.js'

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        username: string
        role: 'user'
      }
    }
  }
}

describe('External API Logs Routes', () => {
  let app: express.Application

  const fileMarker = getTestFileMarker(import.meta.url)
  const ownerUserId = fileMarker
  const otherUserId = `${fileMarker.slice(0, 30)}other2`
  const ownerUserToken = 'owner-token'
  const otherUserToken = 'other-token'
  const userToken = ownerUserToken

  const tokenToUser = new Map<string, { userId: string; username: string; role: 'user' }>([
    [ownerUserToken, { userId: ownerUserId, username: `owner-${fileMarker.slice(0, 8)}`, role: 'user' }],
    [otherUserToken, { userId: otherUserId, username: `other-${fileMarker.slice(0, 8)}`, role: 'user' }],
  ])

  const mockAuthMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const authorization = req.header('Authorization')
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
    const user = token ? tokenToUser.get(token) : undefined

    if (user) {
      req.user = user
    }

    next()
  }

  async function createLogForUser(userId: string) {
    const conn = getConnection()
    const rows = await conn.query<{ id: number; status: string; user_id: string }>(
      `INSERT INTO external_api_logs (
        service_provider, api_endpoint, operation, request_params, request_body, response_body,
        status, error_message, duration_ms, user_id, trace_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, status, user_id`,
      [
        'openai',
        'POST /v1/images/generations',
        'image_generation',
        JSON.stringify({ model: 'gpt-image-2' }),
        JSON.stringify({ prompt: 'owner seeded log' }),
        null,
        'pending',
        null,
        null,
        userId,
        `trace-${userId.slice(0, 26)}`,
        new Date().toISOString(),
      ]
    )

    const created = rows[0]
    if (!created) {
      throw new Error('Failed to seed external api log')
    }

    return {
      id: String(created.id),
      status: created.status,
      user_id: created.user_id,
    }
  }

  beforeAll(async () => {
    await setupTestDatabase()

    app = express()
    app.use(express.json())
    app.use(mockAuthMiddleware)
    app.use('/api/external-api-logs', externalApiLogsRouter)

    const conn = getConnection()
    const now = new Date().toISOString()

    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [ownerUserId, tokenToUser.get(ownerUserToken)?.username, 'hash', 'user', true, now, now]
    )

    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [otherUserId, tokenToUser.get(otherUserToken)?.username, 'hash', 'user', true, now, now]
    )
  })

  beforeEach(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM external_api_logs WHERE user_id = $1 OR user_id = $2', [ownerUserId, otherUserId])
  })

  afterAll(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM external_api_logs WHERE user_id = $1 OR user_id = $2', [ownerUserId, otherUserId])
    await conn.execute('DELETE FROM users WHERE id = $1 OR id = $2', [ownerUserId, otherUserId])
    await teardownTestDatabase()
  })

  it('creates an openai external api log for the authenticated user', async () => {
    const response = await request(app)
      .post('/api/external-api-logs')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        service_provider: 'openai',
        api_endpoint: 'POST /v1/images/generations',
        operation: 'image_generation',
        request_params: { model: 'gpt-image-2', image_count: 1 },
        request_body: JSON.stringify({ prompt: '一张电影感人像海报，暖色光照，细节丰富' }),
      })
      .expect(201)

    expect(response.body.success).toBe(true)
    expect(response.body.data.status).toBe('pending')
    expect(response.body.data.user_id).toBe(ownerUserId)
  })

  it('updates only the owner log', async () => {
    const created = await createLogForUser(ownerUserId)

    await request(app)
      .patch(`/api/external-api-logs/${created.id}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ status: 'success', duration_ms: 100 })
      .expect(404)

    const response = await request(app)
      .patch(`/api/external-api-logs/${created.id}`)
      .set('Authorization', `Bearer ${ownerUserToken}`)
      .send({
        status: 'success',
        duration_ms: 100,
        response_body: JSON.stringify({ image_count: 1, usage: { total_tokens: 120 } }),
      })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.status).toBe('success')
    expect(response.body.data.duration_ms).toBe(100)
    expect(response.body.data.user_id).toBe(ownerUserId)
  })

  it('rejects base64 image payloads in log writes', async () => {
    await request(app)
      .post('/api/external-api-logs')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        service_provider: 'openai',
        api_endpoint: 'POST /v1/images/generations',
        operation: 'image_generation',
        response_body: 'iVBORw0KGgoAAAANSUhEUgAA'.repeat(20),
      })
      .expect(400)
  })
})
