import { createConnection, getConnection, closeConnection, resetConnection } from '../database/connection.js'
import { DatabaseService } from '../database/service-async.js'

export function getTestDbConfig() {
  return {
    pgHost: process.env.DB_HOST || 'localhost',
    pgPort: parseInt(process.env.DB_PORT || '5432', 10),
    pgUser: process.env.DB_TEST_USER || process.env.DB_USER || 'postgres',
    pgPassword: process.env.DB_TEST_PASSWORD || process.env.DB_PASSWORD || '',
    pgDatabase: process.env.DB_TEST_NAME || `${process.env.DB_NAME || 'mnx_agent'}_test`,
  }
}

let isInitialized = false

export async function setupTestDatabase() {
  if (isInitialized) {
    return
  }

  resetConnection()
  await createConnection(getTestDbConfig())
  const db = new DatabaseService(getConnection())
  await db.init()
  isInitialized = true
}

export async function teardownTestDatabase() {
  // In fileParallelism: false mode, all tests run in the same process.
  // Don't close the connection between test files - let the global teardown handle it.
  // This prevents "Cannot use a pool after calling end" errors.
}

export async function globalTeardown() {
  await closeConnection()
  isInitialized = false
}

export { getConnection }