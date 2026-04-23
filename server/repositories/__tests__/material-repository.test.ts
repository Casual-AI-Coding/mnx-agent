import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase, getConnection, getTestFileMarker } from '../../__tests__/test-helpers.js'
import { MaterialRepository } from '../material-repository.js'
import type { DatabaseConnection } from '../../database/connection.js'
import { v4 as uuidv4 } from 'uuid'

describe('MaterialRepository', () => {
  let conn: DatabaseConnection
  let repository: MaterialRepository
  let ownerId: string
  let otherOwnerId: string
  let fileMarker: string

  beforeAll(async () => {
    await setupTestDatabase()
    conn = getConnection()
    repository = new MaterialRepository(conn)
    fileMarker = getTestFileMarker(import.meta.url)
    ownerId = uuidv4()
    otherOwnerId = uuidv4()

    const now = new Date().toISOString()
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO NOTHING`,
      [
        ownerId,
        `material-owner-${fileMarker.slice(0, 8)}`,
        'hash',
        'user',
        true,
        now,
        now,
        otherOwnerId,
        `material-owner-alt-${fileMarker.slice(0, 8)}`,
        'hash',
        'user',
        true,
        now,
        now,
      ]
    )
  })

  beforeEach(async () => {
    await conn.execute('DELETE FROM prompts WHERE owner_id IN ($1, $2)', [ownerId, otherOwnerId])
    await conn.execute('DELETE FROM material_items WHERE owner_id IN ($1, $2)', [ownerId, otherOwnerId])
    await conn.execute('DELETE FROM materials WHERE owner_id IN ($1, $2)', [ownerId, otherOwnerId])
  })

  afterAll(async () => {
    await conn.execute('DELETE FROM prompts WHERE owner_id IN ($1, $2)', [ownerId, otherOwnerId])
    await conn.execute('DELETE FROM material_items WHERE owner_id IN ($1, $2)', [ownerId, otherOwnerId])
    await conn.execute('DELETE FROM materials WHERE owner_id IN ($1, $2)', [ownerId, otherOwnerId])
    await conn.execute('DELETE FROM users WHERE id IN ($1, $2)', [ownerId, otherOwnerId])
    await teardownTestDatabase()
  })

  it('creates and queries material by owner scope', async () => {
    const created = await repository.create({
      ownerId,
      material_type: 'artist',
      name: '周同学',
      description: '流行音乐人',
    })

    const ownMaterial = await repository.getById(created.id, ownerId)
    const otherMaterial = await repository.getById(created.id, otherOwnerId)

    expect(ownMaterial).not.toBeNull()
    expect(ownMaterial?.name).toBe('周同学')
    expect(otherMaterial).toBeNull()
  })

  it('updates and soft deletes material', async () => {
    const created = await repository.create({
      ownerId,
      material_type: 'artist',
      name: '待更新音乐人',
      description: null,
    })

    const updated = await repository.update(
      created.id,
      {
        name: '已更新音乐人',
        description: '更新后的描述',
      },
      ownerId
    )

    expect(updated).not.toBeNull()
    expect(updated?.name).toBe('已更新音乐人')

    const deleted = await repository.softDelete(created.id, ownerId)
    expect(deleted).toBe(true)

    const afterDelete = await repository.getById(created.id, ownerId)
    expect(afterDelete).toBeNull()
  })
})
