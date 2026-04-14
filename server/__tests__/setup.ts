import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.test first to override any values from .env
config({ path: resolve(__dirname, '../../.env.test') })
config({ path: resolve(__dirname, '../../.env') })

// Explicitly unset MINIMAX_API_KEY to prevent real API calls during testing
process.env.MINIMAX_API_KEY = ''

// Set test-specific MEDIA_ROOT to prevent accidental deletion of production data
process.env.MEDIA_ROOT = './test-media-storage'

import { setupTestDatabase, globalTeardown } from './test-helpers.js'

export { setupTestDatabase as setup, globalTeardown as teardown }