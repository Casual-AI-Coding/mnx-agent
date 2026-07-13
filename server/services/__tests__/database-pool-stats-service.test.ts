import { describe, expect, it } from 'vitest'
import type { DatabaseConnection } from '../../database/connection.js'
import type { DatabaseService } from '../../database/service-async.js'
import { DatabasePoolStatsService, type DatabasePoolStats } from '../database-pool-stats-service.js'

type DatabaseFixture = Pick<DatabaseService, 'getConnection'>
type PoolStatsConnection = DatabaseConnection & { getPoolStats(): DatabasePoolStats }

function createDatabase(connection: DatabaseConnection): DatabaseFixture {
  return { getConnection: () => connection }
}

function createConnection(isPostgres: boolean): DatabaseConnection {
  const connection: DatabaseConnection = {
    async query() {
      return []
    },
    async execute() {
      return { changes: 0 }
    },
    async transaction(fn) {
      return fn(connection)
    },
    async close() {},
    isPostgres() {
      return isPostgres
    },
  }
  return connection
}

function createPoolStatsConnection(stats: DatabasePoolStats): PoolStatsConnection {
  const connection: PoolStatsConnection = {
    ...createConnection(true),
    getPoolStats() {
      return stats
    },
  }
  return connection
}

describe('DatabasePoolStatsService', () => {
  it('returns null when the database connection has no PostgreSQL pool statistics capability', () => {
    const service = new DatabasePoolStatsService(createDatabase(createConnection(false)))

    expect(service.getReport()).toBeNull()
  })

  it('returns a healthy report when no requests wait for a connection', () => {
    const service = new DatabasePoolStatsService(
      createDatabase(createPoolStatsConnection({ totalCount: 4, idleCount: 2, waitingCount: 0 }))
    )

    expect(service.getReport()).toEqual({
      pool: { totalCount: 4, idleCount: 2, waitingCount: 0 },
      status: 'healthy',
      warning: null,
      recommendation: null,
    })
  })

  it('returns a congested report and expansion recommendation above five waiting requests', () => {
    const service = new DatabasePoolStatsService(
      createDatabase(createPoolStatsConnection({ totalCount: 10, idleCount: 0, waitingCount: 6 }))
    )

    expect(service.getReport()).toEqual({
      pool: { totalCount: 10, idleCount: 0, waitingCount: 6 },
      status: 'congested',
      warning: '6 requests waiting for connection - consider increasing DB_POOL_MAX',
      recommendation: 'Connection pool is under pressure. Consider increasing DB_POOL_MAX environment variable.',
    })
  })
})
