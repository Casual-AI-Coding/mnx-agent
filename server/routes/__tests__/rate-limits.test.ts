import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import {
  setupTestDatabase,
  teardownTestDatabase,
  getTestFileMarker,
} from '../../__tests__/test-helpers.js'
import rateLimitsRouter from '../admin/rate-limits.js'
import { getRateLimitForService, __resetRateLimitsStateForTests } from '../../config/rate-limits.js'

const testUser = vi.hoisted(() => ({
  userId: 'rate-test-admin',
  username: 'rate-admin',
  role: 'super' as const,
}))

vi.mock('../../middleware/auth-middleware.js', () => ({
  requireRole: () => (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未认证' })
      return
    }
    if (req.user.role !== 'super') {
      res.status(403).json({ success: false, error: '权限不足' })
      return
    }
    next()
  },
}))

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { userId: string; username: string; role: 'super' }
    }
  }
}

describe('admin rate-limits routes', () => {
  let app: express.Application

  const fileMarker = getTestFileMarker(import.meta.url)

  beforeAll(async () => {
    await setupTestDatabase()
    __resetRateLimitsStateForTests()

    app = express()
    app.use(express.json())
    app.use((req, _res, next) => {
      req.user = testUser
      next()
    })
    app.use('/api/admin/rate-limits', rateLimitsRouter)

    const conn = (await import('../../database/connection.js')).getConnection()
    const now = new Date().toISOString()
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, 'hash', 'super', true, $3, $3)
       ON CONFLICT (id) DO NOTHING`,
      [testUser.userId, testUser.username, now]
    )
  }, 60_000)

  afterAll(() => {
    teardownTestDatabase()
    __resetRateLimitsStateForTests()
  })

  it('未认证请求被拒绝', async () => {
    const bare = express()
    bare.use(express.json())
    bare.use('/api/admin/rate-limits', rateLimitsRouter)
    const response = await request(bare).get('/api/admin/rate-limits')
    expect(response.status).toBe(401)
  })

  it('GET 返回生效视图（默认无覆盖）', async () => {
    const response = await request(app).get('/api/admin/rate-limits')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.services.text).toEqual({ rpm: 500, overridden: false })
    expect(response.body.data.services.video).toEqual({ rpm: 5, overridden: false })
    expect(response.body.data.configKey).toBe('ratelimit.service_rpm')
  })

  it('PUT 校验非法配置返回 400', async () => {
    const response = await request(app)
      .put('/api/admin/rate-limits')
      .send({ config: 'text=abc' })

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('无效的速率限制条目')
  })

  it('PUT 写入配置并即时生效，GET 反映覆盖', async () => {
    const put = await request(app)
      .put('/api/admin/rate-limits')
      .send({ config: `text=42,video=2` })

    expect(put.status).toBe(200)
    expect(put.body.data.services.text).toEqual({ rpm: 42, overridden: true })
    expect(getRateLimitForService('text')).toBe(42)
    expect(getRateLimitForService('video')).toBe(2)

    const get = await request(app).get('/api/admin/rate-limits')
    expect(get.body.data.services.text.overridden).toBe(true)
    expect(get.body.data.services.text.rpm).toBe(42)
  })

  it('PUT 空配置清除覆盖回退默认', async () => {
    const put = await request(app)
      .put('/api/admin/rate-limits')
      .send({ config: '' })

    expect(put.status).toBe(200)
    expect(put.body.data.services.text).toEqual({ rpm: 500, overridden: false })
    expect(getRateLimitForService('text')).toBe(500)
    expect(fileMarker).toBeTruthy()
  })
})
