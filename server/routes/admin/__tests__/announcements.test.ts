import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import express from 'express'
import request from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import { setupTestDatabase, teardownTestDatabase, getConnection, getTestFileMarker } from '../../../__tests__/test-helpers.js'
import announcementsRouter from '../announcements.js'

const mockUser = {
  userId: 'test-announcement-owner',
  username: 'test-announcement-super',
  role: 'super',
}

const normalUser = {
  userId: 'test-announcement-viewer',
  username: 'test-announcement-user',
  role: 'user',
}

let currentUser = mockUser

const mockAuthMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  req.user = currentUser
  next()
}

describe('Admin Announcements API Routes', () => {
  let app: express.Application
  const fileMarker = getTestFileMarker(import.meta.url)

  beforeAll(async () => {
    await setupTestDatabase()
    const conn = getConnection()
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      [mockUser.userId, `announcement-super-${fileMarker.slice(0, 8)}`, 'hash', 'super', true]
    )
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      [normalUser.userId, `announcement-user-${fileMarker.slice(0, 8)}`, 'hash', 'user', true]
    )

    app = express()
    app.use(express.json())
    app.use(mockAuthMiddleware)
    app.use('/api/admin/announcements', announcementsRouter)
  })

  beforeEach(async () => {
    currentUser = mockUser
    await getConnection().execute('DELETE FROM announcements WHERE owner_id = $1', [mockUser.userId])
  })

  afterAll(async () => {
    await getConnection().execute('DELETE FROM announcements WHERE owner_id = $1', [mockUser.userId])
    await getConnection().execute('DELETE FROM users WHERE id = $1', [mockUser.userId])
    await getConnection().execute('DELETE FROM users WHERE id = $1', [normalUser.userId])
    await teardownTestDatabase()
  })

  it('creates and lists an announcement for super users', async () => {
    const res = await request(app)
      .post('/api/admin/announcements')
      .send({
        title: `版本维护通知 ${fileMarker}`,
        content: '今晚 23:00-23:30 将进行系统维护。',
        severity: 'info',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toMatchObject({
      title: `版本维护通知 ${fileMarker}`,
      content: '今晚 23:00-23:30 将进行系统维护。',
      severity: 'info',
      status: 'draft',
      owner_id: mockUser.userId,
    })

    const listRes = await request(app).get('/api/admin/announcements')

    expect(listRes.status).toBe(200)
    expect(listRes.body.success).toBe(true)
    expect(listRes.body.data.total).toBe(1)
    expect(listRes.body.data.items[0].id).toBe(res.body.data.id)
  })

  it('rejects an announcement publish window whose end precedes the start', async () => {
    const res = await request(app)
      .post('/api/admin/announcements')
      .send({
        title: `错误时间窗口 ${fileMarker}`,
        content: '结束时间不能早于开始时间。',
        status: 'published',
        starts_at: '2026-07-08T10:00:00',
        ends_at: '2026-07-08T09:59:00',
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('rejects malformed announcement time values before database insert', async () => {
    const res = await request(app)
      .post('/api/admin/announcements')
      .send({
        title: `非法时间 ${fileMarker}`,
        content: '非法时间字符串应该在边界层被拒绝。',
        starts_at: 'not-a-date',
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('returns only currently published announcements from the active endpoint', async () => {
    const conn = getConnection()
    const activeId = uuidv4()
    const draftId = uuidv4()
    await conn.execute(
      `INSERT INTO announcements (
        id, title, content, severity, status, starts_at, ends_at, owner_id, created_by, updated_by, created_at, updated_at, is_deleted
      ) VALUES
        ($1, $2, $3, 'warning', 'published', CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '1 hour', $4, $4, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
        ($5, $6, $7, 'info', 'draft', NULL, NULL, $4, $4, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false)`,
      [
        activeId,
        `当前公告 ${fileMarker}`,
        '当前用户应该看到。',
        mockUser.userId,
        draftId,
        `草稿公告 ${fileMarker}`,
        '草稿不应该返回。',
      ]
    )

    const res = await request(app).get('/api/admin/announcements/active')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject({ id: activeId, status: 'published' })
  })

  it('allows regular authenticated users to read active announcements but not the admin list', async () => {
    const conn = getConnection()
    const activeId = uuidv4()
    await conn.execute(
      `INSERT INTO announcements (
        id, title, content, severity, status, starts_at, ends_at, owner_id, created_by, updated_by, created_at, updated_at, is_deleted
      ) VALUES ($1, $2, $3, 'info', 'published', NULL, NULL, $4, $4, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false)`,
      [activeId, `面向用户公告 ${fileMarker}`, '普通用户应该看到系统公告。', mockUser.userId]
    )

    currentUser = normalUser

    const activeRes = await request(app).get('/api/admin/announcements/active')
    const adminListRes = await request(app).get('/api/admin/announcements')

    expect(activeRes.status).toBe(200)
    expect(activeRes.body.success).toBe(true)
    expect(activeRes.body.data[0]).toMatchObject({ id: activeId })
    expect(adminListRes.status).toBe(403)
  })

  it('updates and soft deletes an announcement', async () => {
    const createRes = await request(app)
      .post('/api/admin/announcements')
      .send({
        title: `待发布公告 ${fileMarker}`,
        content: '将被发布后删除。',
        severity: 'info',
      })

    const announcementId = createRes.body.data.id
    const updateRes = await request(app)
      .patch(`/api/admin/announcements/${announcementId}`)
      .send({ status: 'published', severity: 'success' })

    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data).toMatchObject({
      id: announcementId,
      status: 'published',
      severity: 'success',
    })

    const deleteRes = await request(app).delete(`/api/admin/announcements/${announcementId}`)

    expect(deleteRes.status).toBe(200)
    expect(deleteRes.body.data.deleted).toBe(true)

    const listRes = await request(app).get('/api/admin/announcements')
    expect(listRes.body.data.items).toHaveLength(0)
  })
})
