import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { setupTestDatabase, teardownTestDatabase, getConnection, getTestFileMarker } from '../../__tests__/test-helpers.js'
import type { DatabaseConnection } from '../connection.js'

describe('Resource Management Database', () => {
  let conn: DatabaseConnection
  let ownerId: string
  let materialId: string
  let fileMarker: string

  beforeAll(async () => {
    await setupTestDatabase()
    conn = getConnection()
    fileMarker = getTestFileMarker(import.meta.url)
    ownerId = uuidv4()

    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [ownerId, `resource-db-test-${fileMarker.slice(0, 8)}`, 'hash', 'user', true, new Date().toISOString(), new Date().toISOString()]
    )
  })

  beforeEach(async () => {
    materialId = uuidv4()

    await conn.execute('DELETE FROM material_items WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM materials WHERE owner_id = $1', [ownerId])

    await conn.execute(
      `INSERT INTO materials (
        id,
        material_type,
        name,
        description,
        owner_id,
        sort_order,
        created_at,
        updated_at,
        is_deleted,
        deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        materialId,
        'artist',
        'Test Artist',
        'artist for duplicate-name constraint test',
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
    await conn.execute('DELETE FROM material_items WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM materials WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM users WHERE id = $1', [ownerId])
    await teardownTestDatabase()
  })

  it('rejects duplicate song names under the same material and item type', async () => {
    await conn.execute(
      `INSERT INTO material_items (
        id,
        material_id,
        item_type,
        name,
        lyrics,
        owner_id,
        sort_order,
        created_at,
        updated_at,
        is_deleted,
        deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        uuidv4(),
        materialId,
        'song',
        'Blue Night',
        'first version',
        ownerId,
        0,
        new Date().toISOString(),
        new Date().toISOString(),
        false,
        null,
      ]
    )

    await expect(
      conn.execute(
        `INSERT INTO material_items (
          id,
          material_id,
          item_type,
          name,
          lyrics,
          owner_id,
          sort_order,
          created_at,
          updated_at,
          is_deleted,
          deleted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          uuidv4(),
          materialId,
          'song',
          'Blue Night',
          'duplicate version',
          ownerId,
          1,
          new Date().toISOString(),
          new Date().toISOString(),
          false,
          null,
        ]
      )
    ).rejects.toThrow()
  })
})
