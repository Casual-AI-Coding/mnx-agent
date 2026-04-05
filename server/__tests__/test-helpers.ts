import { createConnection, getConnection, closeConnection, resetConnection } from '../database/connection.js'
import { resetDatabase } from '../database/service-async.js'

export function getTestDbConfig() {
  return {
    pgHost: process.env.DB_HOST || 'localhost',
    pgPort: parseInt(process.env.DB_PORT || '5432', 10),
    pgUser: process.env.DB_TEST_USER || 'mnx_agent_server_test',
    pgPassword: process.env.DB_TEST_PASSWORD || 'passwd_mnx_agent_test_90idas0disa',
    pgDatabase: process.env.DB_TEST_NAME || 'mnx_agent_test',
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