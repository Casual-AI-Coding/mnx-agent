import { Pool, PoolClient, PoolConfig, QueryResult } from 'pg'
import { getLogger } from '../lib/logger.js'

const logger = getLogger()

export interface DatabaseConfig {
  pgHost?: string
  pgPort?: number
  pgUser?: string
  pgPassword?: string
  pgDatabase?: string
  pgPoolMax?: number
  pgPoolIdleTimeout?: number
  pgConnectionTimeout?: number
}

export interface QueryResultRow {
  [key: string]: any
}

export interface DatabaseConnection {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: any[]): Promise<T[]>
  execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid?: string | number }>
  transaction<T>(fn: (conn: DatabaseConnection) => Promise<T>): Promise<T>
  close(): Promise<void>
  isPostgres(): boolean
}

function getConfigFromEnv(): DatabaseConfig {
  return {
    pgHost: process.env.DB_HOST || 'localhost',
    pgPort: parseInt(process.env.DB_PORT || '5432', 10),
    pgUser: process.env.DB_USER || 'postgres',
    pgPassword: process.env.DB_PASSWORD || '',
    pgDatabase: process.env.DB_NAME || 'minimax',
    pgPoolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
    pgPoolIdleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
    pgConnectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  }
}

class PostgresConnection implements DatabaseConnection {
  private pool: Pool
  private consecutiveErrors: number = 0
  private readonly maxConsecutiveErrors: number = 5
  
  constructor(config: DatabaseConfig) {
    const poolConfig: PoolConfig = {
      host: config.pgHost,
      port: config.pgPort,
      user: config.pgUser,
      password: config.pgPassword,
      database: config.pgDatabase,
      max: config.pgPoolMax || 10,
      idleTimeoutMillis: config.pgPoolIdleTimeout || 30000,
      connectionTimeoutMillis: config.pgConnectionTimeout || 5000,
      // KeepAlive configuration to detect stale connections
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    }
    
    this.pool = new Pool(poolConfig)
    
    this.pool.on('error', (err) => {
      this.consecutiveErrors++
      logger.error({ 
        msg: 'PostgreSQL pool error', 
        error: err.message,
        consecutiveErrors: this.consecutiveErrors 
      })
      
      // Log warning if too many consecutive errors
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        logger.error({
          msg: 'PostgreSQL pool experiencing persistent errors',
          consecutiveErrors: this.consecutiveErrors,
          recommendation: 'Consider checking database connectivity or restarting the pool'
        })
      }
    })
    
    this.pool.on('connect', () => {
      // Reset error counter on successful connection
      this.consecutiveErrors = 0
    })
  }
  
  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: any[]): Promise<T[]> {
    const start = Date.now()
    try {
      const result: QueryResult<T> = await this.pool.query(sql, params)
      this.consecutiveErrors = 0 // Reset on success
      return result.rows
    } catch (error) {
      logger.error({ msg: 'PostgreSQL query error', sql: sql.substring(0, 100), error: (error as Error).message })
      throw error
    } finally {
      const ms = Date.now() - start
      if (ms > 100) {
        logger.warn({ msg: 'Slow query', ms, sql: sql.substring(0, 50) })
      }
    }
  }
  
  async execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid?: string | number }> {
    const result = await this.pool.query(sql, params)
    return {
      changes: result.rowCount || 0,
      lastInsertRowid: result.rows?.[0]?.id,
    }
  }
  
  async transaction<T>(fn: (conn: DatabaseConnection) => Promise<T>): Promise<T> {
    const client: PoolClient = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const txConn = new PostgresTransactionConnection(client)
      const result = await fn(txConn)
      await client.query('COMMIT')
      return result
    } catch (error) {
      // Try to rollback, but don't let rollback failure hide the original error
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        logger.error({
          msg: 'Failed to rollback transaction',
          originalError: (error as Error).message,
          rollbackError: (rollbackError as Error).message
        })
      }
      throw error
    } finally {
      client.release()
    }
  }
  
  async close(): Promise<void> {
    await this.pool.end()
  }
  
  isPostgres(): boolean { return true }
  
  getPool(): Pool {
    return this.pool
  }
  
  getPoolStats(): { totalCount: number; idleCount: number; waitingCount: number } {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    }
  }
}

class PostgresTransactionConnection implements DatabaseConnection {
  private client: PoolClient
  
  constructor(client: PoolClient) {
    this.client = client
  }
  
  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: any[]): Promise<T[]> {
    const result: QueryResult<T> = await this.client.query(sql, params)
    return result.rows
  }
  
  async execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid?: string | number }> {
    const result = await this.client.query(sql, params)
    return {
      changes: result.rowCount || 0,
      lastInsertRowid: result.rows[0]?.id,
    }
  }
  
  async transaction<T>(_fn: (conn: DatabaseConnection) => Promise<T>): Promise<T> {
    throw new Error('Nested transactions not supported')
  }
  
  async close(): Promise<void> {}
  
  isPostgres(): boolean { return true }
}

let connectionInstance: DatabaseConnection | null = null

export async function createConnection(config?: DatabaseConfig): Promise<DatabaseConnection> {
  const finalConfig = config || getConfigFromEnv()
  
  logger.info({ msg: 'Creating PostgreSQL connection', host: finalConfig.pgHost, database: finalConfig.pgDatabase })
  
  connectionInstance = new PostgresConnection(finalConfig)
  
  return connectionInstance
}

export function getConnection(): DatabaseConnection {
  if (!connectionInstance) {
    throw new Error('Database connection not initialized. Call createConnection() first.')
  }
  return connectionInstance
}

export async function closeConnection(): Promise<void> {
  if (connectionInstance) {
    await connectionInstance.close()
    connectionInstance = null
  }
}

export { PostgresConnection }