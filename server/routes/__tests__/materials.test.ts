import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { v4 as uuidv4 } from 'uuid'
import { setupTestDatabase, teardownTestDatabase, getConnection, getTestFileMarker } from '../../__tests__/test-helpers.js'
import { getDatabaseService } from '../../service-registration.js'
import materialsRouter from '../materials.js'

type AuthenticatedRequest = express.Request & {
  user?: {
    userId: string
    username: string
    role: 'user'
  }
}

describe('Materials API Routes', () => {
  let app: express.Application
  let ownerId: string

  const mockAuthMiddleware = (req: AuthenticatedRequest, _res: express.Response, next: express.NextFunction) => {
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

  it('filters materials by material_type', async () => {
    const created = await createMaterial()

    const res = await request(app).get('/api/materials?material_type=artist')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.records).toHaveLength(1)
    expect(res.body.data.records[0].id).toBe(created.body.data.id)
    expect(res.body.data.records[0].material_type).toBe('artist')
    expect(res.body.data.pagination.total).toBe(1)
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

  it('updates a material successfully', async () => {
    const createRes = await createMaterial()

    const updateRes = await request(app)
      .put(`/api/materials/${createRes.body.data.id}`)
      .send({
        name: 'Updated Artist',
        description: 'Updated description',
      })

    expect(updateRes.status).toBe(200)
    expect(updateRes.body.success).toBe(true)
    expect(updateRes.body.data.id).toBe(createRes.body.data.id)
    expect(updateRes.body.data.name).toBe('Updated Artist')
    expect(updateRes.body.data.description).toBe('Updated description')
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

  it('creates, updates, reorders and soft deletes material items', async () => {
    const material = await getDatabaseService().createMaterial({
      name: 'Item Artist',
      material_type: 'artist',
    }, ownerId)

    const firstCreate = await request(app)
      .post(`/api/materials/${material.id}/items`)
      .send({
        name: 'Song A',
        item_type: 'song',
        lyrics: 'lyrics-a',
        sort_order: 0,
      })

    const secondCreate = await request(app)
      .post(`/api/materials/${material.id}/items`)
      .send({
        name: 'Song B',
        item_type: 'song',
        lyrics: 'lyrics-b',
        sort_order: 1,
      })

    expect(firstCreate.status).toBe(201)
    expect(secondCreate.status).toBe(201)

    const updateRes = await request(app)
      .put(`/api/materials/items/${firstCreate.body.data.id}`)
      .send({
        name: 'Song A Revised',
        lyrics: 'lyrics-a-2',
      })

    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data.name).toBe('Song A Revised')

    const reorderRes = await request(app)
      .post(`/api/materials/${material.id}/items/reorder`)
      .send({
        items: [
          { id: secondCreate.body.data.id, sort_order: 0 },
          { id: firstCreate.body.data.id, sort_order: 1 },
        ],
      })

    expect(reorderRes.status).toBe(200)
    expect(reorderRes.body.success).toBe(true)

    const detailAfterReorder = await request(app).get(`/api/materials/${material.id}/detail`)
    expect(detailAfterReorder.status).toBe(200)
    expect(detailAfterReorder.body.data.items[0].id).toBe(secondCreate.body.data.id)
    expect(detailAfterReorder.body.data.items[1].id).toBe(firstCreate.body.data.id)

    const deleteRes = await request(app).delete(`/api/materials/items/${secondCreate.body.data.id}`)
    expect(deleteRes.status).toBe(200)
    expect(deleteRes.body.success).toBe(true)

    const detailAfterDelete = await request(app).get(`/api/materials/${material.id}/detail`)
    expect(detailAfterDelete.status).toBe(200)
    expect(detailAfterDelete.body.data.items).toHaveLength(1)
    expect(detailAfterDelete.body.data.items[0].id).toBe(firstCreate.body.data.id)
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

  it('rejects creating item under a material owned by another user', async () => {
    // Create material as ownerId (the default test user)
    const material = await getDatabaseService().createMaterial({
      name: 'Other User Material',
      material_type: 'artist',
    }, ownerId)

    // Simulate a different user trying to create an item under that material
    const otherUserId = getTestFileMarker(import.meta.url + '-other-user')

    // Create the other user in DB
    const conn = getConnection()
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [otherUserId, `other-user-${otherUserId.slice(0, 8)}`, 'hash', 'user', true, new Date().toISOString(), new Date().toISOString()]
    )

    // Set mock auth to use the other user's ID
    const originalUserId = ownerId
    ownerId = otherUserId

    const res = await request(app)
      .post(`/api/materials/${material.id}/items`)
      .send({
        name: 'Unauthorized Item',
        item_type: 'song',
        lyrics: 'lyrics',
        sort_order: 0,
      })

    // Should be rejected - either 403 or 404
    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)

    // Restore original ownerId
    ownerId = originalUserId

    // Cleanup other user
    await conn.execute('DELETE FROM prompts WHERE owner_id = $1', [otherUserId])
    await conn.execute('DELETE FROM material_items WHERE owner_id = $1', [otherUserId])
    await conn.execute('DELETE FROM materials WHERE owner_id = $1', [otherUserId])
    await conn.execute('DELETE FROM users WHERE id = $1', [otherUserId])
  })

  it('allows creating item under a material owned by the same user', async () => {
    const material = await getDatabaseService().createMaterial({
      name: 'Same Owner Material',
      material_type: 'artist',
    }, ownerId)

    const res = await request(app)
      .post(`/api/materials/${material.id}/items`)
      .send({
        name: 'Authorized Item',
        item_type: 'song',
        lyrics: 'lyrics',
        sort_order: 0,
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.name).toBe('Authorized Item')
  })
})
