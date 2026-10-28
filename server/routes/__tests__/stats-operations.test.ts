import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import {
  setupTestDatabase,
  teardownTestDatabase,
  getConnection,
  getTestFileMarker,
} from '../../__tests__/test-helpers.js'
import statsRouter from '../stats.js'

const testIds = vi.hoisted(() => ({
  ownerUserId: 'op-test-owner',
  otherUserId: 'op-test-other',
  ownerToken: 'owner-token',
  otherToken: 'other-token',
}))

const fileMarker = getTestFileMarker(import.meta.url)
const seedId = (suffix: string) => `${fileMarker.slice(0, 32)}-${suffix}`
const imageServiceType = `${fileMarker.slice(0, 24)}-img`
const videoServiceType = `${fileMarker.slice(0, 24)}-vid`
const ownerUserId = testIds.ownerUserId
const otherUserId = testIds.otherUserId
const ownerToken = testIds.ownerToken
const otherToken = testIds.otherToken

// 认证中间件替换为基于 token 表的桩实现，只注入 req.user，不校验 JWT
vi.mock('../../middleware/auth-middleware.js', () => ({
  authenticateJWT: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const header = req.header('Authorization')
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
    const userId = token === testIds.ownerToken ? testIds.ownerUserId : token === testIds.otherToken ? testIds.otherUserId : undefined
    if (!userId) {
      res.status(401).json({ success: false, error: 'unauthorized' })
      return
    }
    req.user = { userId, username: `u-${userId.slice(0, 8)}`, role: 'user' }
    next()
  },
  requireRole: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { userId: string; username: string; role: 'user' }
    }
  }
}

async function seedExecutionLog(conn: ReturnType<typeof getConnection>, params: {
  id: string
  ownerId: string
  status: string
  durationMs: number
  startedAt: string
  errorSummary?: string
}) {
  await conn.execute(
    `INSERT INTO execution_logs (id, job_id, owner_id, trigger_type, status, started_at, completed_at, duration_ms, tasks_executed, tasks_succeeded, tasks_failed, error_summary)
     VALUES ($1, NULL, $2, 'manual', $3, $4, $4, $5, 1, 0, 0, $6)`,
    [params.id, params.ownerId, params.status, params.startedAt, params.durationMs, params.errorSummary ?? null]
  )
}

describe('GET /api/stats/operations', () => {
  let app: express.Application

  beforeAll(async () => {
    await setupTestDatabase()

    app = express()
    app.use(express.json())
    app.use('/api/stats', statsRouter)

    const conn = getConnection()
    const now = new Date().toISOString()

    // 清理上次运行残留（测试库跨运行持久化），保证种子幂等
    await conn.execute('DELETE FROM dead_letter_queue WHERE owner_id = $1 OR owner_id = $2', [ownerUserId, otherUserId])
    await conn.execute('DELETE FROM execution_logs WHERE owner_id = $1 OR owner_id = $2', [ownerUserId, otherUserId])

    for (const user of [ownerUserId, otherUserId]) {
      await conn.execute(
        `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
         VALUES ($1, $2, 'hash', 'user', true, $3, $3)
         ON CONFLICT (id) DO NOTHING`,
        [user, user === ownerUserId ? 'op-test-owner' : 'op-test-other', now]
      )
    }

    // owner：3 成功 + 1 失败；other：1 失败（不应计入 owner 视图）
    await seedExecutionLog(conn, { id: `${seedId('e1')}`, ownerId: ownerUserId, status: 'completed', durationMs: 1000, startedAt: '2026-10-01T00:00:00Z' })
    await seedExecutionLog(conn, { id: `${seedId('e2')}`, ownerId: ownerUserId, status: 'completed', durationMs: 2000, startedAt: '2026-10-01T00:01:00Z' })
    await seedExecutionLog(conn, { id: `${seedId('e3')}`, ownerId: ownerUserId, status: 'completed', durationMs: 3000, startedAt: '2026-10-01T00:02:00Z' })
    await seedExecutionLog(conn, { id: `${seedId('e4')}`, ownerId: ownerUserId, status: 'failed', durationMs: 4000, startedAt: '2026-10-01T00:03:00Z', errorSummary: '配额不足' })
    await seedExecutionLog(conn, { id: `${seedId('e5')}`, ownerId: otherUserId, status: 'failed', durationMs: 5000, startedAt: '2026-10-01T00:04:00Z' })

    // DLQ：owner 未解决 1 条 + 已解决 1 条；other 未解决 1 条
    await conn.execute(
      `INSERT INTO dead_letter_queue (id, original_task_id, job_id, owner_id, task_type, payload, error_message, retry_count, max_retries, failed_at, created_at)
       VALUES ($1, NULL, NULL, $2, 'image_generation', '{}', 'quota exceeded', 3, 3, '2026-10-02T00:00:00Z', '2026-10-02T00:00:00Z')`,
      [`${seedId('d1')}`, ownerUserId]
    )
    await conn.execute(
      `INSERT INTO dead_letter_queue (id, original_task_id, job_id, owner_id, task_type, payload, error_message, retry_count, max_retries, failed_at, resolved_at, resolution, created_at)
       VALUES ($1, NULL, NULL, $2, 'text_generation', '{}', 'timeout', 3, 3, '2026-10-02T01:00:00Z', '2026-10-02T02:00:00Z', 'deleted', '2026-10-02T01:00:00Z')`,
      [`${seedId('d2')}`, ownerUserId]
    )
    await conn.execute(
      `INSERT INTO dead_letter_queue (id, original_task_id, job_id, owner_id, task_type, payload, error_message, retry_count, max_retries, failed_at, created_at)
       VALUES ($1, NULL, NULL, $2, 'music_generation', '{}', 'upstream 500', 3, 3, '2026-10-02T03:00:00Z', '2026-10-02T03:00:00Z')`,
      [`${seedId('d3')}`, otherUserId]
    )

    // 容量快照：image 剩余 10%（风险），video 剩余 80%（正常）
    await conn.execute(
      `INSERT INTO capacity_tracking (id, service_type, remaining_quota, total_quota, reset_at, last_checked_at)
       VALUES ($1, $4, 10, 100, NULL, $2), ($3, $5, 80, 100, NULL, $2)
       ON CONFLICT (service_type) DO UPDATE SET remaining_quota = EXCLUDED.remaining_quota, total_quota = EXCLUDED.total_quota, last_checked_at = EXCLUDED.last_checked_at`,
      [`${seedId('c1')}`, now, `${seedId('c2')}`, imageServiceType, videoServiceType]
    )
  }, 60_000)

  afterAll(() => {
    teardownTestDatabase()
  })

  it('未携带 token 返回 401', async () => {
    const response = await request(app).get('/api/stats/operations')
    expect(response.status).toBe(401)
  })

  it('返回运营总览聚合数据', async () => {
    const response = await request(app)
      .get('/api/stats/operations')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)

    const data = response.body.data
    expect(data.executions).toMatchObject({
      totalExecutions: 4,
      successRate: 0.75,
      failureRate: 0.25,
      avgDuration: 2500,
      errorCount: 1,
    })

    const failures = data.recentFailures
    expect(failures).toHaveLength(1)
    expect(failures[0]).toMatchObject({ status: 'failed', error_summary: '配额不足' })

    expect(data.dlq.unresolvedCount).toBe(1)
    expect(data.dlq.recent).toHaveLength(1)
    expect(data.dlq.recent[0]).toMatchObject({ task_type: 'image_generation' })

    const capacityByService = Object.fromEntries(
      data.capacity.records.map((r: { service_type: string; remaining_quota: number; total_quota: number }) => [r.service_type, r])
    )
    expect(capacityByService[imageServiceType]).toMatchObject({ remaining_quota: 10, total_quota: 100 })
    expect(data.capacity.atRisk).toContain(imageServiceType)

    expect(data.health.database).toBe(true)
    expect(data.health.uptimeSeconds).toBeGreaterThanOrEqual(0)
  })

  it('owner 之间数据相互隔离', async () => {
    const response = await request(app)
      .get('/api/stats/operations')
      .set('Authorization', `Bearer ${otherToken}`)

    expect(response.status).toBe(200)
    const data = response.body.data
    expect(data.executions.totalExecutions).toBe(1)
    expect(data.executions.errorCount).toBe(1)
    expect(data.dlq.unresolvedCount).toBe(1)
    expect(data.dlq.recent[0]).toMatchObject({ task_type: 'music_generation' })
  })
})
