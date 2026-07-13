import { describe, expect, it } from 'vitest'
import {
  AdminUserRepository,
  type AdminUserListItem,
} from '../admin-user-repository.js'

type QueryCall = {
  sql: string
  params: unknown[] | undefined
}

function createConnectionFixture(): {
  connection: {
    query: {
      (sql: string): Promise<Array<{ total: string | number }>>
      (sql: string, params: unknown[]): Promise<AdminUserListItem[]>
    }
  }
  calls: QueryCall[]
  setCountRows(rows: Array<{ total: string | number }>): void
  setListedUsers(rows: AdminUserListItem[]): void
} {
  const calls: QueryCall[] = []
  let countRows: Array<{ total: string | number }> = []
  let listedUsers: AdminUserListItem[] = []

  function query(sql: string): Promise<Array<{ total: string | number }>>
  function query(sql: string, params: unknown[]): Promise<AdminUserListItem[]>
  async function query(
    sql: string,
    params?: unknown[]
  ): Promise<Array<{ total: string | number }> | AdminUserListItem[]> {
    calls.push({ sql, params })
    return params ? listedUsers : countRows
  }

  return {
    connection: { query },
    calls,
    setCountRows(rows): void {
      countRows = rows
    },
    setListedUsers(rows): void {
      listedUsers = rows
    },
  }
}

describe('AdminUserRepository', () => {
  it('converts the user count to a number', async () => {
    const { connection, calls, setCountRows } = createConnectionFixture()
    setCountRows([{ total: '7' }])
    const repository = new AdminUserRepository(connection)

    await expect(repository.countUsers()).resolves.toBe(7)
    expect(calls).toEqual([{ sql: 'SELECT COUNT(*) as total FROM users', params: undefined }])
  })

  it('lists users with masked API keys and parameterized pagination', async () => {
    const listedUsers = [{
      id: 'user-2',
      username: 'tester',
      email: 'tester@example.com',
      minimax_api_key: 'minimax_****1234',
      minimax_region: 'cn',
      role: 'user',
      is_active: true,
      last_login_at: null,
      created_at: '2026-07-14T00:00:00.000',
      updated_at: '2026-07-14T00:00:00.000',
    }]
    const { connection, calls, setListedUsers } = createConnectionFixture()
    setListedUsers(listedUsers)
    const repository = new AdminUserRepository(connection)

    await expect(repository.listUsers({ limit: 5, offset: 5 })).resolves.toEqual(listedUsers)
    expect(calls[0]?.params).toEqual([5, 5])
    const sql = calls[0]?.sql
    expect(sql).toContain("CONCAT('minimax_', '****', SUBSTRING(minimax_api_key, -4))")
    expect(sql).toContain('ORDER BY created_at DESC LIMIT $1 OFFSET $2')
    expect(sql).not.toContain('password_hash')
  })
})
