import { createConnection, getConnection, closeConnection, resetConnection } from '../database/connection.js'
import { resetDatabase } from '../database/service-async.js'

const testDbName = process.env.DB_TEST_NAME || `${process.env.DB_NAME || 'mnx_agent'}_test`

export function getTestDbConfig() {
  return {
    pgHost: process.env.DB_HOST || 'localhost',
    pgPort: parseInt(process.env.DB_PORT || '5432', 10),
    pgUser: process.env.DB_USER || 'postgres',
    pgPassword: process.env.DB_PASSWORD || '',
    pgDatabase: testDbName,
  }
}

export async function setupTestDatabase() {
  resetConnection()
  resetDatabase()
  await createConnection(getTestDbConfig())
}

export async function teardownTestDatabase() {
  await closeConnection()
}

export { getConnection }