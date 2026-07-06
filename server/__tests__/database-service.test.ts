import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DatabaseService } from '../database/service-async.js'
import { setupTestDatabase, teardownTestDatabase, getConnection, getTestFileMarker } from './test-helpers.js'
import type { QueryResultRow } from '../database/connection.js'

type ValueRow = QueryResultRow & {
  value: number
}

describe('DatabaseService', () => {
  let db: DatabaseService
  let fileMarker: string

  beforeAll(async () => {
    await setupTestDatabase()
    db = new DatabaseService(getConnection())
    fileMarker = getTestFileMarker(import.meta.url)
  })

  afterAll(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM users WHERE id = $1', [fileMarker])
    await teardownTestDatabase()
  })

  it('reports an active PostgreSQL connection', async () => {
    const connected = await db.isConnected()

    expect(connected).toBe(true)
    expect(db.isPostgres()).toBe(true)
  })

  it('exposes the underlying connection', () => {
    const conn = db.getConnection()

    expect(conn).toBeDefined()
    expect(typeof conn.query).toBe('function')
    expect(typeof conn.execute).toBe('function')
  })

  it('runs raw SQL helpers', async () => {
    const runResult = await db.run(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [fileMarker, `db-service-${fileMarker}`, 'hash', 'user', true, new Date().toISOString(), new Date().toISOString()]
    )
    const one = await db.get<ValueRow>('SELECT 1 AS value')
    const rows = await db.all<ValueRow>('SELECT 1 AS value UNION ALL SELECT 2 AS value ORDER BY value')

    expect(runResult.changes).toBeGreaterThanOrEqual(0)
    expect(one?.value).toBe(1)
    expect(rows.map(row => row.value)).toEqual([1, 2])
  })

  it('runs callbacks inside a transaction-scoped DatabaseService', async () => {
    const result = await db.transaction(async txDb => {
      const row = await txDb.get<ValueRow>('SELECT 42 AS value')
      return row?.value
    })

    expect(result).toBe(42)
  })
})
