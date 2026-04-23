import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { setupTestDatabase, teardownTestDatabase, getConnection, getTestFileMarker } from '../../__tests__/test-helpers.js'
import { PromptRepository } from '../prompt-repository.js'
import type { DatabaseConnection } from '../../database/connection.js'

describe('PromptRepository', () => {
  let conn: DatabaseConnection
  let repository: PromptRepository
  let ownerId: string
  let otherOwnerId: string
  let materialId: string
  let fileMarker: string

  beforeAll(async () => {
    await setupTestDatabase()
    conn = getConnection()
    repository = new PromptRepository(conn)
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
        `prompt-owner-${fileMarker.slice(0, 8)}`,
        'hash',
        'user',
        true,
        now,
        now,
        otherOwnerId,
        `prompt-owner-alt-${fileMarker.slice(0, 8)}`,
        'hash',
        'user',
        true,
        now,
        now,
      ]
    )
  })

  beforeEach(async () => {
    materialId = uuidv4()
    const now = new Date().toISOString()

    await conn.execute('DELETE FROM prompts WHERE owner_id IN ($1, $2)', [ownerId, otherOwnerId])
    await conn.execute('DELETE FROM material_items WHERE owner_id IN ($1, $2)', [ownerId, otherOwnerId])
    await conn.execute('DELETE FROM materials WHERE owner_id IN ($1, $2)', [ownerId, otherOwnerId])

    await conn.execute(
      `INSERT INTO materials (
        id, material_type, name, description, owner_id, sort_order,
        created_at, updated_at, is_deleted, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        materialId,
        'artist',
        'Prompt Test Artist',
        'artist for prompt repository tests',
        ownerId,
        0,
        now,
        now,
        false,
        null,
      ]
    )
  })

  afterAll(async () => {
    await conn.execute('DELETE FROM prompts WHERE owner_id IN ($1, $2)', [ownerId, otherOwnerId])
    await conn.execute('DELETE FROM material_items WHERE owner_id IN ($1, $2)', [ownerId, otherOwnerId])
    await conn.execute('DELETE FROM materials WHERE owner_id IN ($1, $2)', [ownerId, otherOwnerId])
    await conn.execute('DELETE FROM users WHERE id IN ($1, $2)', [ownerId, otherOwnerId])
    await teardownTestDatabase()
  })

  it('keeps only one default prompt in the same target and slot', async () => {
    const first = await repository.create({
      targetType: 'material-main',
      targetId: materialId,
      slotType: 'artist-style',
      name: '候选 A',
      content: 'A',
      isDefault: true,
      ownerId,
    })

    const second = await repository.create({
      targetType: 'material-main',
      targetId: materialId,
      slotType: 'artist-style',
      name: '候选 B',
      content: 'B',
      isDefault: true,
      ownerId,
    })

    const prompts = await repository.listByTarget({
      targetType: 'material-main',
      targetId: materialId,
      slotType: 'artist-style',
      ownerId,
    })

    expect(prompts.filter((item) => item.is_default)).toHaveLength(1)
    expect(prompts.find((item) => item.id === second.id)?.is_default).toBe(true)
    expect(prompts.find((item) => item.id === first.id)?.is_default).toBe(false)
  })

  it('promotes next prompt when deleting default prompt', async () => {
    const first = await repository.create({
      targetType: 'material-main',
      targetId: materialId,
      slotType: 'artist-style',
      name: '默认项',
      content: 'default',
      isDefault: true,
      ownerId,
      sortOrder: 0,
    })

    const second = await repository.create({
      targetType: 'material-main',
      targetId: materialId,
      slotType: 'artist-style',
      name: '候补项',
      content: 'candidate',
      isDefault: false,
      ownerId,
      sortOrder: 1,
    })

    const deleted = await repository.softDelete(first.id, ownerId)
    expect(deleted).toBe(true)

    const prompts = await repository.listByTarget({
      targetType: 'material-main',
      targetId: materialId,
      slotType: 'artist-style',
      ownerId,
    })

    expect(prompts).toHaveLength(1)
    expect(prompts[0]?.id).toBe(second.id)
    expect(prompts[0]?.is_default).toBe(true)
  })

  it('isolates prompts by owner', async () => {
    await repository.create({
      targetType: 'material-main',
      targetId: materialId,
      slotType: 'artist-style',
      name: '我的提示词',
      content: 'mine',
      isDefault: true,
      ownerId,
    })

    await repository.create({
      targetType: 'material-main',
      targetId: materialId,
      slotType: 'artist-style',
      name: '其他用户提示词',
      content: 'others',
      isDefault: true,
      ownerId: otherOwnerId,
    })

    const ownPrompts = await repository.listByTarget({
      targetType: 'material-main',
      targetId: materialId,
      slotType: 'artist-style',
      ownerId,
    })

    expect(ownPrompts).toHaveLength(1)
    expect(ownPrompts[0]?.name).toBe('我的提示词')
  })
})
