/**
 * Centralized Configuration Module
 * 
 * Loads and validates all environment variables with sensible defaults.
 * Provides typed access to configuration throughout the application.
 */

export * from './timeouts.js'
export * from './rate-limits.js'
export * from './limits.js'

// ============================================================================
// Type Definitions
// ============================================================================

export interface AppConfig {
  server: {
    port: number
    corsOrigins: string[]
    nodeEnv: 'development' | 'production' | 'test'
  }
  database: {
    host: string
    port: number
    user: string
    password: string
    name: string
    poolMax: number
    poolIdleTimeout: number
    connectionTimeout: number
  }
  auth: {
    jwtSecret: string
    bcryptRounds: number
  }
  minimax: {
    apiKey: string | undefined
    region: 'domestic' | 'international'
  }
  cron: {
    timezone: string
    maxConcurrent: number
  }
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    prettyPrint: boolean
    fileOutput: boolean
    logDir: string
  }
  rateLimit: {
    authWindowMs: number
    authMax: number
  }
}

// ============================================================================
// Required Environment Variables
// ============================================================================

const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
] as const

type RequiredEnvVar = typeof REQUIRED_ENV_VARS[number]

// ============================================================================
// JWT_SECRET Validation (Fail-Fast)
// ============================================================================

const JWT_SECRET_MIN_LENGTH = 32

export function validateJwtSecret(): void {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }

  if (jwtSecret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters (got ${jwtSecret.length}). ` +
      'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }
}

// ============================================================================
// Config Loading
// ============================================================================

let cachedConfig: AppConfig | undefined

function parseInteger(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue
  return value === 'true' || value === '1'
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) return ['http://localhost:3000', 'http://localhost:4511']
  return value.split(',').map(s => s.trim())
}

function validateRequiredEnvVars(): void {
  const missing: RequiredEnvVar[] = []
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

export function loadConfig(): AppConfig {
  // JWT_SECRET validation runs ALWAYS (fail-fast) - even in test mode
  validateJwtSecret()

  if (process.env.NODE_ENV !== 'test') {
    validateRequiredEnvVars()
  }

  const nodeEnv = (process.env.NODE_ENV as AppConfig['server']['nodeEnv']) || 'development'

  return {
    server: {
      port: parseInteger(process.env.PORT, 4511),
      corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
      nodeEnv,
    },
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInteger(process.env.DB_PORT, 5432),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      name: process.env.DB_NAME || 'mnx_agent',
      poolMax: parseInteger(process.env.DB_POOL_MAX, 10),
      poolIdleTimeout: parseInteger(process.env.DB_POOL_IDLE_TIMEOUT, 30000),
      connectionTimeout: parseInteger(process.env.DB_CONNECTION_TIMEOUT, 5000),
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET!,
      bcryptRounds: parseInteger(process.env.BCRYPT_ROUNDS, 12),
    },
    minimax: {
      apiKey: process.env.MINIMAX_API_KEY,
      region: (process.env.MINIMAX_REGION as 'domestic' | 'international') || 'international',
    },
    cron: {
      timezone: process.env.CRON_TIMEZONE || 'Asia/Shanghai',
      maxConcurrent: parseInteger(process.env.CRON_MAX_CONCURRENT, 5),
    },
    logging: {
      level: (process.env.LOG_LEVEL as AppConfig['logging']['level']) || 'info',
      prettyPrint: parseBoolean(process.env.LOG_PRETTY, nodeEnv !== 'production'),
      fileOutput: parseBoolean(process.env.LOG_FILE, false),
      logDir: process.env.LOG_DIR || 'logs',
    },
    rateLimit: {
      authWindowMs: parseInteger(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 900000),
      authMax: parseInteger(process.env.AUTH_RATE_LIMIT_MAX, 100),
    },
  }
}

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig()
  }
  return cachedConfig
}
