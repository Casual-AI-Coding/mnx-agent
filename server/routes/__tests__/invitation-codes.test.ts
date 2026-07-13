import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import express from 'express'
import request from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import { getConnection, getTestFileMarker, setupTestDatabase, teardownTestDatabase } from '../../__tests__/test-helpers.js'
import invitationCodesRouter from '../invitation-codes.js'

const fileMarker = getTestFileMarker(import.meta.url)
const owner = {
  userId: fileMarker,
  username: `invitation-owner-${fileMarker.slice(0, 8)}`,
  role: 'super',
}
const otherOwner = {
  userId: uuidv4(),
  username: `invitation-other-${fileMarker.slice(0, 8)}`,
  role: 'super',
}

let currentUser = owner

describe('Invitation Codes API Routes', () => {
  let app: express.Application

  beforeAll(async () => {
    await setupTestDatabase()
    const connection = getConnection()
    for (const user of [owner, otherOwner]) {
      await connection.execute(
        `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO NOTHING`,
        [user.userId, user.username, 'hash', user.role, true],
      )
    }

    app = express()
    app.use(express.json())
    app.use((req, _res, next) => {
      req.user = currentUser
      next()
    })
    app.use('/api/invitation-codes', invitationCodesRouter)
  })

  beforeEach(async () => {
    currentUser = owner
    await getConnection().execute(
      'DELETE FROM invitation_codes WHERE created_by = $1 OR created_by = $2',
      [owner.userId, otherOwner.userId],
    )
  })

  afterAll(async () => {
    const connection = getConnection()
    await connection.execute(
      'DELETE FROM invitation_codes WHERE created_by = $1 OR created_by = $2',
      [owner.userId, otherOwner.userId],
    )
    await connection.execute('DELETE FROM users WHERE id = $1 OR id = $2', [owner.userId, otherOwner.userId])
    await teardownTestDatabase()
  })

  it('creates and lists administrator-owned codes without adding an omitted expiry field', async () => {
    const createResponse = await request(app)
      .post('/api/invitation-codes/batch')
      .send({ count: 2, max_uses: 3 })

    expect(createResponse.status).toBe(201)
    expect(createResponse.body).toMatchObject({
      success: true,
      data: { count: 2 },
    })
    expect(createResponse.body.data.codes).toHaveLength(2)
    expect(createResponse.body.data.codes[0]).not.toHaveProperty('expires_at')
    expect(createResponse.body.data.codes[0].code).toMatch(/^[0-9A-F]{32}$/)

    const listResponse = await request(app).get('/api/invitation-codes')

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.success).toBe(true)
    expect(listResponse.body.data).toHaveLength(2)
    expect(listResponse.body.data[0]).toMatchObject({
      created_by: owner.userId,
      created_by_username: owner.username,
      max_uses: 3,
    })
  })

  it('preserves empty update, ownership and deactivation responses', async () => {
    const createResponse = await request(app)
      .post('/api/invitation-codes/batch')
      .send({ count: 1, max_uses: 1 })
    const generatedCode = createResponse.body.data.codes[0].code
    const rows = await getConnection().query<{ id: string }>(
      'SELECT id FROM invitation_codes WHERE code = $1',
      [generatedCode],
    )
    const codeId = rows[0]?.id

    expect(codeId).toBeDefined()

    const emptyUpdateResponse = await request(app).patch(`/api/invitation-codes/${codeId}`).send({})
    expect(emptyUpdateResponse.status).toBe(200)
    expect(emptyUpdateResponse.body.data).toMatchObject({
      message: '无更新内容',
      data: { id: codeId, max_uses: 1 },
    })

    const updateResponse = await request(app)
      .patch(`/api/invitation-codes/${codeId}`)
      .send({ max_uses: 5, is_active: false })
    expect(updateResponse.status).toBe(200)
    expect(updateResponse.body.data).toMatchObject({ id: codeId, max_uses: 5, is_active: false })

    const deleteResponse = await request(app).delete(`/api/invitation-codes/${codeId}`)
    expect(deleteResponse.status).toBe(200)
    expect(deleteResponse.body.data).toEqual({ message: '邀请码已失效' })

    const otherCodeId = uuidv4()
    await getConnection().execute(
      `INSERT INTO invitation_codes (id, code, created_by, max_uses, used_count, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [otherCodeId, `OTHER${fileMarker.replace(/-/g, '').slice(0, 27)}`, otherOwner.userId, 1, 0, true],
    )

    const forbiddenUpdateResponse = await request(app)
      .patch(`/api/invitation-codes/${otherCodeId}`)
      .send({ max_uses: 2 })
    expect(forbiddenUpdateResponse.status).toBe(404)
    expect(forbiddenUpdateResponse.body).toEqual({ success: false, error: '邀请码不存在' })
  })
})
