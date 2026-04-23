import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { v4 as uuidv4 } from 'uuid'
import { setupTestDatabase, teardownTestDatabase, getConnection, getTestFileMarker } from '../../__tests__/test-helpers.js'
import { getDatabaseService } from '../../service-registration.js'
import promptsRouter from '../prompts.js'
import type { PromptRecord } from '../../database/types.js'

type AuthenticatedRequest = express.Request & {
  user?: {
    userId: string
    username: string
    role: 'user'
  }
}

describe('Prompts API Routes', () => {
  let app: express.Application
  let ownerId: string
  let materialId: string

  const mockAuthMiddleware = (req: AuthenticatedRequest, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      userId: ownerId,
      username: 'prompts-api-test',
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
    app.use('/api/prompts', promptsRouter)

    const conn = getConnection()
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [ownerId, `prompts-api-test-${ownerId.slice(0, 8)}`, 'hash', 'user', true, new Date().toISOString(), new Date().toISOString()]
    )
  })

  beforeEach(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM prompts WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM material_items WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM materials WHERE owner_id = $1', [ownerId])

    materialId = uuidv4()
    await conn.execute(
      `INSERT INTO materials (
        id, material_type, name, description, owner_id, sort_order,
        created_at, updated_at, is_deleted, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        materialId,
        'artist',
        'Prompt Test Artist',
        null,
        ownerId,
        0,
        new Date().toISOString(),
        new Date().toISOString(),
        false,
        null,
      ]
    )
  })

  afterAll(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM prompts WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM material_items WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM materials WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM users WHERE id = $1', [ownerId])
    await teardownTestDatabase()
  })

  async function createPrompt(name: string, isDefault: boolean) {
    return request(app).post('/api/prompts').send({
      target_type: 'material-main',
      target_id: materialId,
      slot_type: 'artist-style',
      name,
      content: `${name} content`,
      is_default: isDefault,
      sort_order: isDefault ? 0 : 1,
    })
  }

  it('creates a prompt successfully', async () => {
    const res = await createPrompt('Artist Prompt', true)

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.name).toBe('Artist Prompt')
    expect(res.body.data.is_default).toBe(true)
  })

  it('keeps only one default prompt in the same target and slot', async () => {
    const first = await createPrompt('Prompt A', true)
    const second = await createPrompt('Prompt B', true)

    expect(first.status).toBe(201)
    expect(second.status).toBe(201)

    const detail = await getDatabaseService().getMaterialDetail(materialId, ownerId)
    expect(detail).not.toBeNull()
    expect(detail?.materialPrompts.filter((item: PromptRecord) => item.is_default)).toHaveLength(1)
    expect(detail?.materialPrompts.find((item: PromptRecord) => item.id === second.body.data.id)?.is_default).toBe(true)
  })

  it('sets a prompt as default explicitly', async () => {
    const first = await createPrompt('Prompt A', true)
    const second = await createPrompt('Prompt B', false)

    const res = await request(app).post(`/api/prompts/${second.body.data.id}/set-default`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.id).toBe(second.body.data.id)
    expect(res.body.data.is_default).toBe(true)

    const detail = await getDatabaseService().getMaterialDetail(materialId, ownerId)
    expect(detail?.materialPrompts.find((item: PromptRecord) => item.id === first.body.data.id)?.is_default).toBe(false)
    expect(detail?.materialPrompts.find((item: PromptRecord) => item.id === second.body.data.id)?.is_default).toBe(true)
  })

  it('promotes next prompt when deleting default prompt', async () => {
    const first = await createPrompt('Default Prompt', true)
    const second = await createPrompt('Backup Prompt', false)

    const deleteRes = await request(app).delete(`/api/prompts/${first.body.data.id}`)

    expect(deleteRes.status).toBe(200)
    expect(deleteRes.body.success).toBe(true)

    const detail = await getDatabaseService().getMaterialDetail(materialId, ownerId)
    expect(detail?.materialPrompts).toHaveLength(1)
    expect(detail?.materialPrompts[0]?.id).toBe(second.body.data.id)
    expect(detail?.materialPrompts[0]?.is_default).toBe(true)
  })
})
