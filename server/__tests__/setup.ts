import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env first, then .env.test to override
config({ path: resolve(__dirname, '../../.env') })
config({ path: resolve(__dirname, '../../.env.test') })

import { setupTestDatabase, teardownTestDatabase } from './test-helpers.js'

export { setupTestDatabase as setup, teardownTestDatabase as teardown }