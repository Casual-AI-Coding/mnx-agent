import { describe, expect, it } from 'vitest'
import {
  AdminUserRepository,
  type AdminUserListItem,
} from '../admin-user-repository.js'

type QueryCall = {
  sql: string
  params: unknown[] | undefined
}

type ExecuteCall = {
  sql: string
  params: unknown[] | undefined
}

function createConnectionFixture(): {
  connection: {
    query: {
      (sql: string): Promise<Array<{ total: string | number }>>
      (sql: string, params: unknown[]): Promise<AdminUserListItem[]>
    }
    execute(sql: string, params?: unknown[]): Promise<{ changes: number }>
  }
  calls: QueryCall[]
  executeCalls: ExecuteCall[]
  setCountRows(rows: Array<{ total: string | number }>): void
  setListedUsers(rows: AdminUserListItem[]): void
  setUpdatedUsers(rows: AdminUserListItem[]): void
} {
  const calls: QueryCall[] = []
  const executeCalls: ExecuteCall[] = []
  let countRows: Array<{ total: string | number }> = []
  let listedUsers: AdminUserListItem[] = []
  let updatedUsers: AdminUserListItem[] = []

  function query(sql: string): Promise<Array<{ total: string | number }>>
  function query(sql: string, params: unknown[]): Promise<AdminUserListItem[]>
  async function query(
    sql: string,
    params?: unknown[]
  ): Promise<Array<{ total: string | number }> | AdminUserListItem[]> {
    calls.push({ sql, params })
    if (!params) return countRows
    return sql.includes('WHERE id = $1') ? updatedUsers : listedUsers
  }

  async function execute(sql: string, params?: unknown[]): Promise<{ changes: number }> {
    executeCalls.push({ sql, params })
    return { changes: 1 }
  }

  return {
    connection: { query, execute },
    calls,
    executeCalls,
    setCountRows(rows): void {
      countRows = rows
    },
    setListedUsers(rows): void {
      listedUsers = rows
    },
    setUpdatedUsers(rows): void {
      updatedUsers = rows
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

  it('updates user attributes with a fixed five-field whitelist in canonical order', async () => {
    const updatedUser: AdminUserListItem = {
      id: 'user-123',
      username: 'alice',
      email: null,
      minimax_api_key: 'minimax_****6789',
      minimax_region: 'intl',
      role: 'admin',
      is_active: false,
      last_login_at: null,
      created_at: '2026-07-01T00:00:00.000',
      updated_at: '2026-07-14T00:00:00.000',
    }
    const { connection, calls, executeCalls, setUpdatedUsers } = createConnectionFixture()
    setUpdatedUsers([updatedUser])
    const repository = new AdminUserRepository(connection)

    const result = await repository.updateUser('user-123', {
      minimax_region: 'intl',
      role: 'admin',
      is_active: false,
      email: null,
      minimax_api_key: 'unmasked-key',
    })

    expect(result).toEqual(updatedUser)
    expect(executeCalls).toEqual([{
      sql: 'UPDATE users SET email = $1, role = $2, is_active = $3, minimax_api_key = $4, minimax_region = $5, updated_at = $6 WHERE id = $7',
      params: [null, 'admin', false, 'unmasked-key', 'intl', expect.any(String), 'user-123'],
    }])
    expect(calls).toEqual([{
      sql: expect.stringContaining('WHERE id = $1'),
      params: ['user-123'],
    }])
    expect(calls[0]?.sql).toContain("CONCAT('minimax_', '****', SUBSTRING(minimax_api_key, -4))")
    expect(calls[0]?.sql).not.toContain('password_hash')
  })

  it('returns null when the updated user does not exist', async () => {
    const { connection, calls, executeCalls } = createConnectionFixture()
    const repository = new AdminUserRepository(connection)

    await expect(repository.updateUser('missing-user', { role: 'admin' })).resolves.toBeNull()
    expect(executeCalls).toEqual([{
      sql: 'UPDATE users SET role = $1, updated_at = $2 WHERE id = $3',
      params: ['admin', expect.any(String), 'missing-user'],
    }])
    expect(calls).toEqual([{
      sql: expect.stringContaining('WHERE id = $1'),
      params: ['missing-user'],
    }])
  })
})
