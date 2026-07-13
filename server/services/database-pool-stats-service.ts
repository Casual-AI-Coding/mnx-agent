import type { DatabaseConnection } from '../database/connection.js'
import type { DatabaseService } from '../database/service-async.js'

export interface DatabasePoolStats {
  totalCount: number
  idleCount: number
  waitingCount: number
}

export interface DatabasePoolStatsReport {
  pool: DatabasePoolStats
  status: 'healthy' | 'congested'
  warning: string | null
  recommendation: string | null
}

type PoolStatsConnection = DatabaseConnection & { getPoolStats(): DatabasePoolStats }
type PoolStatsDatabase = Pick<DatabaseService, 'getConnection'>

function supportsPoolStats(connection: DatabaseConnection): connection is PoolStatsConnection {
  return connection.isPostgres() && 'getPoolStats' in connection && typeof connection.getPoolStats === 'function'
}

export class DatabasePoolStatsService {
  constructor(private readonly database: PoolStatsDatabase) {}

  getReport(): DatabasePoolStatsReport | null {
    const connection = this.database.getConnection()
    if (!supportsPoolStats(connection)) {
      return null
    }

    const pool = connection.getPoolStats()
    const waitingCount = pool.waitingCount

    return {
      pool,
      status: waitingCount > 0 ? 'congested' : 'healthy',
      warning: waitingCount > 0
        ? `${waitingCount} requests waiting for connection - consider increasing DB_POOL_MAX`
        : null,
      recommendation: waitingCount > 5
        ? 'Connection pool is under pressure. Consider increasing DB_POOL_MAX environment variable.'
        : null,
    }
  }
}
