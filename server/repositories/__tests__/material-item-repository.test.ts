import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase, getConnection, getTestFileMarker } from '../../__tests__/test-helpers.js'
import { MaterialRepository } from '../material-repository.js'
import { MaterialItemRepository } from '../material-item-repository.js'
import type { DatabaseConnection } from '../../database/connection.js'
import { v4 as uuidv4 } from 'uuid'

describe('MaterialItemRepository', () => {
  let conn: DatabaseConnection
  let materialRepository: MaterialRepository
  let itemRepository: MaterialItemRepository
  let ownerId: string
  let fileMarker: string
  let materialId: string

  beforeAll(async () => {
    await setupTestDatabase()
    conn = getConnection()
    materialRepository = new MaterialRepository(conn)
    itemRepository = new MaterialItemRepository(conn)
    fileMarker = getTestFileMarker(import.meta.url)
    ownerId = uuidv4()

    const now = new Date().toISOString()
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        ownerId,
        `material-item-owner-${fileMarker.slice(0, 8)}`,
        'hash',
        'user',
        true,
        now,
        now,
      ]
    )
  })

  beforeEach(async () => {
    await conn.execute('DELETE FROM prompts WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM material_items WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM materials WHERE owner_id = $1', [ownerId])

    const material = await materialRepository.create({
      ownerId,
      material_type: 'artist',
      name: 'Item Test Artist',
      description: null,
    })
    materialId = material.id
  })

  afterAll(async () => {
    await conn.execute('DELETE FROM prompts WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM material_items WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM materials WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM users WHERE id = $1', [ownerId])
    await teardownTestDatabase()
  })

  it('creates material item and rejects duplicate active name under same material', async () => {
    await itemRepository.create({
      ownerId,
      material_id: materialId,
      item_type: 'song',
      name: 'Blue Night',
      lyrics: 'first version',
    })

    await expect(
      itemRepository.create({
        ownerId,
        material_id: materialId,
        item_type: 'song',
        name: 'Blue Night',
        lyrics: 'duplicate version',
      })
    ).rejects.toThrow()
  })

  it('reorders items within material scope', async () => {
    const first = await itemRepository.create({
      ownerId,
      material_id: materialId,
      item_type: 'song',
      name: 'Song A',
      sort_order: 0,
    })
    const second = await itemRepository.create({
      ownerId,
      material_id: materialId,
      item_type: 'song',
      name: 'Song B',
      sort_order: 1,
    })

    await itemRepository.reorder(materialId, [
      { id: second.id, sort_order: 0 },
      { id: first.id, sort_order: 1 },
    ], ownerId)

    const items = await itemRepository.listByMaterial(materialId, ownerId)
    expect(items[0]?.id).toBe(second.id)
    expect(items[1]?.id).toBe(first.id)
  })

  it('throws on reorder when any item id does not belong to the material', async () => {
    const itemB = await itemRepository.create({
      ownerId,
      material_id: materialId,
      item_type: 'song',
      name: 'Song B',
      sort_order: 1,
    })

    const bogusId = uuidv4()

    await expect(
      itemRepository.reorder(materialId, [
        { id: itemB.id, sort_order: 0 },
        { id: bogusId, sort_order: 1 },
      ], ownerId)
    ).rejects.toThrow('not all items matched')
  })

  it('throws on reorder when any item id belongs to a different material', async () => {
    const itemA = await itemRepository.create({
      ownerId,
      material_id: materialId,
      item_type: 'song',
      name: 'Song A',
      sort_order: 0,
    })

    const otherMaterial = await materialRepository.create({
      ownerId,
      material_type: 'artist',
      name: 'Other Artist',
      description: null,
    })
    const itemFromOther = await itemRepository.create({
      ownerId,
      material_id: otherMaterial.id,
      item_type: 'song',
      name: 'Other Song',
      sort_order: 0,
    })

    await expect(
      itemRepository.reorder(materialId, [
        { id: itemA.id, sort_order: 0 },
        { id: itemFromOther.id, sort_order: 1 },
      ], ownerId)
    ).rejects.toThrow('not all items matched')
  })
})
