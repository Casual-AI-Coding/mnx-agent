import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../../.env') })

import { createConnection, getConnection, closeConnection, resetConnection } from '../database/connection.js'
import { resetDatabase } from '../database/service-async.js'

let globalConnectionCreated = false

export async function setup() {
  if (!globalConnectionCreated) {
    resetConnection()
    resetDatabase()
    await createConnection({
      pgHost: process.env.DB_HOST || 'localhost',
      pgPort: parseInt(process.env.DB_PORT || '5432', 10),
      pgUser: process.env.DB_USER || 'postgres',
      pgPassword: process.env.DB_PASSWORD || '',
      pgDatabase: process.env.DB_NAME || 'minimax_agent',
    })
    globalConnectionCreated = true
  }
}

export async function teardown() {
  await closeConnection()
}