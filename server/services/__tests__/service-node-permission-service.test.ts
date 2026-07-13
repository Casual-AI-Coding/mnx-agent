import { describe, expect, it } from 'vitest'
import type { DatabaseConnection, QueryResultRow } from '../../database/connection.js'
import { UserRepository } from '../../repositories/user-repository.js'
import { ServiceNodePermissionService } from '../service-node-permission-service.js'

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

describe('ServiceNodePermissionService', () => {
  it('delegates every editable permission field without exposing a connection', async () => {
    const executions: Execution[] = []
    const repository = new UserRepository(createConnection(executions))
    const service = new ServiceNodePermissionService(repository)

    await service.update('permission-1', {
      display_name: '新的展示名称',
      category: '生成',
      min_role: 'admin',
      is_enabled: false,
    })

    expect(executions).toEqual([{
      sql: 'UPDATE service_node_permissions SET display_name = $1, category = $2, min_role = $3, is_enabled = $4 WHERE id = $5',
      params: ['新的展示名称', '生成', 'admin', false, 'permission-1'],
    }])
    expect('getConnection' in service).toBe(false)
  })
})
