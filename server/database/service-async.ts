import { DatabaseConnection, createConnection, closeConnection, QueryResultRow } from './connection.js'

export class DatabaseService {
  private readonly conn: DatabaseConnection

  constructor(conn: DatabaseConnection) {
    this.conn = conn
  }

  async init(): Promise<void> {
    const { runMigrations } = await import('./migrations-async.js')
    await runMigrations(this.conn)
  }

  async close(): Promise<void> {
    await closeConnection()
  }

  getConnection(): DatabaseConnection {
    return this.conn
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.conn.query('SELECT 1')
      return true
    } catch {
      return false
    }
  }

  isPostgres(): boolean {
    return this.conn.isPostgres()
  }

  async transaction<T>(fn: (db: DatabaseService) => Promise<T>): Promise<T> {
    return this.conn.transaction(async (txConn) => {
      const txDb = new DatabaseService(txConn)
      return fn(txDb)
    })
  }

  async run(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid?: string | number }> {
    return this.conn.execute(sql, params)
  }

  async get<T extends QueryResultRow>(sql: string, params?: unknown[]): Promise<T | undefined> {
    const rows = await this.conn.query<T>(sql, params)
    return rows[0]
  }

  async all<T extends QueryResultRow>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.conn.query<T>(sql, params)
  }
}

let dbInstance: DatabaseService | null = null

export async function getDatabase(): Promise<DatabaseService> {
  if (!dbInstance) {
    const conn = await createConnection()
    dbInstance = new DatabaseService(conn)
    await dbInstance.init()
  }
  return dbInstance
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close()
    dbInstance = null
  }
}

export function resetDatabase(): void {
  dbInstance = null
}
