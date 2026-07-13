import { describe, expect, it } from 'vitest'
import type { DatabaseConnection, QueryResultRow } from '../../database/connection.js'
import { UserRepository } from '../user-repository.js'

type Execution = {
  sql: string
  params: unknown[] | undefined
}

function createConnection(executions: Execution[]): DatabaseConnection {
  const connection: DatabaseConnection = {
    async query<T extends QueryResultRow = QueryResultRow>(): Promise<T[]> {
      return []
    },
    async execute(sql: string, params?: unknown[]) {
      executions.push({ sql, params })
      return { changes: 1 }
    },
    async transaction<T>(fn: (transactionConnection: DatabaseConnection) => Promise<T>): Promise<T> {
      return fn(connection)
    },
    async close(): Promise<void> {},
    isPostgres(): boolean {
      return true
    },
  }

  return connection
}

describe('UserRepository service node permissions', () => {
  it('updates only the fixed editable permission fields with parameters', async () => {
    const executions: Execution[] = []
    const repository = new UserRepository(createConnection(executions))

    await repository.updateServiceNodePermission('permission-1', {
      display_name: '新的展示名称',
      category: '生成',
      min_role: 'admin',
      is_enabled: false,
    })

    expect(executions).toEqual([{
      sql: 'UPDATE service_node_permissions SET display_name = $1, category = $2, min_role = $3, is_enabled = $4 WHERE id = $5',
      params: ['新的展示名称', '生成', 'admin', false, 'permission-1'],
    }])
  })

  it('does not execute an update when no editable field is supplied', async () => {
    const executions: Execution[] = []
    const repository = new UserRepository(createConnection(executions))

    await repository.updateServiceNodePermission('permission-1', {})

    expect(executions).toEqual([])
  })
})
