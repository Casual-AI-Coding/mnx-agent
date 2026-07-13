import { describe, expect, it } from 'vitest'
import type { DatabaseConnection, QueryResultRow } from '../../database/connection.js'
import { InvitationCodeRepository } from '../invitation-code-repository.js'

interface QueryCall {
  sql: string
  params: unknown[] | undefined
}

interface ExecuteCall {
  sql: string
  params: unknown[] | undefined
}

function createConnectionFixture(changes: number = 1): {
  connection: DatabaseConnection
  queryCalls: QueryCall[]
  executeCalls: ExecuteCall[]
} {
  const queryCalls: QueryCall[] = []
  const executeCalls: ExecuteCall[] = []
  const connection: DatabaseConnection = {
    async query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<T[]> {
      queryCalls.push({ sql, params })
      return []
    },
    async execute(sql: string, params?: unknown[]): Promise<{ changes: number }> {
      executeCalls.push({ sql, params })
      return { changes }
    },
    async transaction<T>(fn: (transactionConnection: DatabaseConnection) => Promise<T>): Promise<T> {
      return fn(connection)
    },
    async close(): Promise<void> {},
    isPostgres(): boolean {
      return true
    },
  }

  return { connection, queryCalls, executeCalls }
}

describe('InvitationCodeRepository', () => {
  it('lists invitation codes owned by the administrator with creator name', async () => {
    const { connection, queryCalls } = createConnectionFixture()
    const repository = new InvitationCodeRepository(connection)

    await repository.listByCreator('admin-1')

    expect(queryCalls).toHaveLength(1)
    expect(queryCalls[0]?.sql).toContain('LEFT JOIN users u ON ic.created_by = u.id')
    expect(queryCalls[0]?.sql).toContain('WHERE ic.created_by = $1')
    expect(queryCalls[0]?.sql).toContain('ORDER BY ic.created_at DESC')
    expect(queryCalls[0]?.params).toEqual(['admin-1'])
  })

  it('looks up a code only within its creator scope', async () => {
    const { connection, queryCalls } = createConnectionFixture()
    const repository = new InvitationCodeRepository(connection)

    const result = await repository.findByIdForCreator('code-1', 'admin-1')

    expect(result).toBeNull()
    expect(queryCalls).toHaveLength(1)
    expect(queryCalls[0]?.sql).toContain('WHERE id = $1 AND created_by = $2')
    expect(queryCalls[0]?.params).toEqual(['code-1', 'admin-1'])
  })

  it('creates an invitation code with parameterized audit values', async () => {
    const { connection, executeCalls } = createConnectionFixture()
    const repository = new InvitationCodeRepository(connection)

    await repository.create({
      code: 'A'.repeat(32),
      creatorId: 'admin-1',
      maxUses: 3,
      expiresAt: '2026-07-15T00:00:00.000',
    })

    expect(executeCalls).toHaveLength(1)
    expect(executeCalls[0]?.sql).toContain('INSERT INTO invitation_codes')
    expect(executeCalls[0]?.sql).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7, $8)')
    expect(executeCalls[0]?.params?.slice(1, 7)).toEqual([
      'A'.repeat(32),
      'admin-1',
      3,
      0,
      '2026-07-15T00:00:00.000',
      true,
    ])
    expect(executeCalls[0]?.params?.[0]).toMatch(/^[0-9a-f-]{36}$/)
    expect(executeCalls[0]?.params?.[7]).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('updates only supplied management fields with positional parameters', async () => {
    const { connection, executeCalls } = createConnectionFixture()
    const repository = new InvitationCodeRepository(connection)

    await repository.update('code-1', 'admin-1', {
      max_uses: 5,
      expires_at: null,
      is_active: false,
    })

    expect(executeCalls).toHaveLength(1)
    expect(executeCalls[0]?.sql).toContain('max_uses = $1, expires_at = $2, is_active = $3')
    expect(executeCalls[0]?.sql).toContain('WHERE id = $4 AND created_by = $5')
    expect(executeCalls[0]?.params).toEqual([5, null, false, 'code-1', 'admin-1'])
  })

  it('deactivates a code only when the administrator owns it', async () => {
    const { connection, executeCalls } = createConnectionFixture(0)
    const repository = new InvitationCodeRepository(connection)

    const deactivated = await repository.deactivate('code-1', 'admin-1')

    expect(deactivated).toBe(false)
    expect(executeCalls).toHaveLength(1)
    expect(executeCalls[0]?.sql).toContain('UPDATE invitation_codes SET is_active = false')
    expect(executeCalls[0]?.sql).toContain('WHERE id = $1 AND created_by = $2')
    expect(executeCalls[0]?.params).toEqual(['code-1', 'admin-1'])
  })
})
