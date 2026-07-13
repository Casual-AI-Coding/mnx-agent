import { describe, expect, it } from 'vitest'
import type { DatabaseConnection } from '../../database/connection.js'
import { AnnouncementRepository } from '../announcement-repository.js'

type RecordedCall = {
  sql: string
  params: unknown[] | undefined
}

interface RecordedConnection extends DatabaseConnection {
  queryCalls: RecordedCall[]
  executeCalls: RecordedCall[]
}

function createConnection(changes: number = 1): RecordedConnection {
  const queryCalls: RecordedCall[] = []
  const executeCalls: RecordedCall[] = []
  const connection: RecordedConnection = {
    async query(sql, params) {
      queryCalls.push({ sql, params })
      return []
    },
    async execute(sql, params) {
      executeCalls.push({ sql, params })
      return { changes }
    },
    async transaction(fn) {
      return fn(connection)
    },
    async close() {},
    isPostgres() {
      return true
    },
    queryCalls,
    executeCalls,
  }

  return connection
}

describe('AnnouncementRepository', () => {
  it('queries only currently published announcements that are inside their publication window', async () => {
    const connection = createConnection()
    const repository = new AnnouncementRepository(connection)

    await expect(repository.findActive()).resolves.toEqual([])

    expect(connection.queryCalls).toHaveLength(1)
    expect(connection.queryCalls[0]?.sql).toContain("status = 'published'")
    expect(connection.queryCalls[0]?.sql).toContain('starts_at <= CURRENT_TIMESTAMP')
    expect(connection.queryCalls[0]?.sql).toContain('ends_at >= CURRENT_TIMESTAMP')
  })

  it('lists non-deleted announcements with creator and updater usernames', async () => {
    const connection = createConnection()
    const repository = new AnnouncementRepository(connection)

    await expect(repository.list()).resolves.toEqual([])

    expect(connection.queryCalls[0]?.sql).toContain('creator.username AS created_by_username')
    expect(connection.queryCalls[0]?.sql).toContain('updater.username AS updated_by_username')
    expect(connection.queryCalls[0]?.sql).toContain('WHERE a.is_deleted = false')
  })

  it('writes audit data with parameterized values when creating an announcement', async () => {
    const connection = createConnection()
    const repository = new AnnouncementRepository(connection)

    await expect(repository.create({
      title: '维护通知',
      content: '今晚维护',
      severity: 'warning',
      status: 'published',
      starts_at: null,
      ends_at: '2026-07-15 00:00:00',
    }, 'owner-1')).resolves.toBeNull()

    expect(connection.executeCalls[0]?.sql).toContain('INSERT INTO announcements')
    expect(connection.executeCalls[0]?.sql).toContain('is_deleted')
    expect(connection.executeCalls[0]?.params?.slice(1, 8)).toEqual([
      '维护通知',
      '今晚维护',
      'warning',
      'published',
      null,
      '2026-07-15 00:00:00',
      'owner-1',
    ])
  })

  it('updates requested fields and retains audit updates in the same statement', async () => {
    const connection = createConnection()
    const repository = new AnnouncementRepository(connection)

    await repository.update('announcement-1', {
      status: 'archived',
      ends_at: null,
    }, 'owner-1')

    expect(connection.executeCalls[0]?.sql).toContain('UPDATE announcements SET status = $1, ends_at = $2, updated_by = $3, updated_at = $4')
    expect(connection.executeCalls[0]?.params?.slice(0, 3)).toEqual(['archived', null, 'owner-1'])
    expect(connection.executeCalls[0]?.params?.at(-1)).toBe('announcement-1')
  })

  it('uses a soft delete and reports whether an announcement was changed', async () => {
    const connection = createConnection(0)
    const repository = new AnnouncementRepository(connection)

    await expect(repository.softDelete('announcement-1', 'owner-1')).resolves.toBe(false)

    expect(connection.executeCalls[0]?.sql).toContain('SET is_deleted = true')
    expect(connection.executeCalls[0]?.params?.slice(1)).toEqual(['owner-1', 'announcement-1'])
  })
})
