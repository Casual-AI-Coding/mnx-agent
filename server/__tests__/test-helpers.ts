import { createConnection, getConnection, closeConnection, resetConnection } from '../database/connection.js'
import { DatabaseService } from '../database/service-async.js'
import { registerServices } from '../service-registration.js'
import { resetContainer } from '../container.js'
import { v4 as uuidv4 } from 'uuid'

const testMarkerCache = new Map<string, string>()

export function getTestFileMarker(testFileUrl: string): string {
  if (!testMarkerCache.has(testFileUrl)) {
    testMarkerCache.set(testFileUrl, uuidv4())
  }
  return testMarkerCache.get(testFileUrl)!
}

export function resetTestFileMarker(): void {
  testMarkerCache.clear()
}

export function getTestDbConfig() {
  return {
    pgHost: process.env.DB_HOST || 'localhost',
    pgPort: parseInt(process.env.DB_PORT || '5432', 10),
    pgUser: process.env.DB_TEST_USER || process.env.DB_USER || 'postgres',
    pgPassword: process.env.DB_TEST_PASSWORD || process.env.DB_PASSWORD || '',
    pgDatabase: process.env.DB_TEST_NAME || `${process.env.DB_NAME || 'mnx_agent'}_test`,
  }
}

let initPromise: Promise<void> | null = null

export async function setupTestDatabase() {
  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    resetContainer()
    resetConnection()
    await createConnection(getTestDbConfig())
    const db = new DatabaseService(getConnection())
    await db.init()
    await registerServices()
  })()

  return initPromise
}

export async function teardownTestDatabase() {}

export async function globalTeardown() {
  await closeConnection()
  initPromise = null
}

export async function withTransaction<T>(fn: (tx: import('../database/connection.js').DatabaseConnection) => Promise<T>): Promise<T> {
  const conn = getConnection()
  return conn.transaction(fn)
}

export { getConnection }
