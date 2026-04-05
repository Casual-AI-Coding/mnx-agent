import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env first, then .env.test to override
config({ path: resolve(__dirname, '../../.env') })
config({ path: resolve(__dirname, '../../.env.test') })

import { setupTestDatabase, globalTeardown } from './test-helpers.js'

export { setupTestDatabase as setup, globalTeardown as teardown }