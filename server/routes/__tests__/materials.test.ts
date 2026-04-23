import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { v4 as uuidv4 } from 'uuid'
import { setupTestDatabase, teardownTestDatabase, getConnection, getTestFileMarker } from '../../__tests__/test-helpers.js'
import { getDatabaseService } from '../../service-registration.js'
import materialsRouter from '../materials.js'

describe('Materials API Routes', () => {
  let app: express.Application
  let ownerId: string

  const mockAuthMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      userId: ownerId,
      username: 'materials-api-test',
      role: 'user' as const,
    }
    next()
  }

  beforeAll(async () => {
    await setupTestDatabase()
    ownerId = getTestFileMarker(import.meta.url)
    app = express()
    app.use(express.json())
    app.use(mockAuthMiddleware)
    app.use('/api/materials', materialsRouter)

    const conn = getConnection()
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [ownerId, `materials-api-test-${ownerId.slice(0, 8)}`, 'hash', 'user', true, new Date().toISOString(), new Date().toISOString()]
    )
  })

  beforeEach(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM prompts WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM material_items WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM materials WHERE owner_id = $1', [ownerId])
  })

  afterAll(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM prompts WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM material_items WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM materials WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM users WHERE id = $1', [ownerId])
    await teardownTestDatabase()
  })

  async function createMaterial() {
    return request(app).post('/api/materials').send({
      name: 'Test Artist',
      material_type: 'artist',
      metadata: {
        source: 'test',
      },
    })
  }

  it('returns empty list initially', async () => {
    const res = await request(app).get('/api/materials')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.records).toEqual([])
    expect(res.body.data.pagination.total).toBe(0)
  })

  it('creates a material successfully', async () => {
    const res = await createMaterial()

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.name).toBe('Test Artist')
    expect(res.body.data.material_type).toBe('artist')
  })

  it('returns a material by id', async () => {
    const createRes = await createMaterial()

    const res = await request(app).get(`/api/materials/${createRes.body.data.id}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.id).toBe(createRes.body.data.id)
    expect(res.body.data.name).toBe('Test Artist')
  })

  it('returns aggregated detail structure', async () => {
    const db = getDatabaseService()
    const material = await db.createMaterial({
      name: 'Detail Artist',
      material_type: 'artist',
      metadata: { scene: 'detail-test' },
    }, ownerId)

    const item = await db.createMaterialItem({
      material_id: material.id,
      name: 'Blue Night',
      item_type: 'song',
      metadata: { bpm: 120 },
    }, ownerId)

    await db.createPrompt({
      target_type: 'material-main',
      target_id: material.id,
      slot_type: 'artist-style',
      name: 'Artist Prompt',
      content: 'cinematic synth pop',
      sort_order: 0,
      is_default: true,
    }, ownerId)

    await db.createPrompt({
      target_type: 'material-item',
      target_id: item.id,
      slot_type: 'song-style',
      name: 'Song Prompt',
      content: 'night drive anthem',
      sort_order: 0,
      is_default: true,
    }, ownerId)

    const res = await request(app).get(`/api/materials/${material.id}/detail`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.material.id).toBe(material.id)
    expect(res.body.data.materialPrompts).toHaveLength(1)
    expect(res.body.data.items).toHaveLength(1)
    expect(res.body.data.items[0].id).toBe(item.id)
    expect(res.body.data.items[0].prompts).toHaveLength(1)
  })

  it('returns 404 after soft delete', async () => {
    const createRes = await createMaterial()

    const deleteRes = await request(app).delete(`/api/materials/${createRes.body.data.id}`)
    expect(deleteRes.status).toBe(200)
    expect(deleteRes.body.success).toBe(true)

    const getRes = await request(app).get(`/api/materials/${createRes.body.data.id}`)
    expect(getRes.status).toBe(404)
    expect(getRes.body.success).toBe(false)
  })

  it('returns 404 for missing material detail', async () => {
    const res = await request(app).get(`/api/materials/${uuidv4()}/detail`)

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})
