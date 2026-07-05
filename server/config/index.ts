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
    nodeEnv: NodeEnv
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
    mediaTokenSecret: string
    bcryptRounds: number
  }
  minimax: {
    apiKey: string | undefined
    region: MiniMaxRegion
  }
  cron: {
    timezone: string
    maxConcurrent: number
  }
  logging: {
    level: LogLevel
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
  'MEDIA_TOKEN_SECRET',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
] as const

type RequiredEnvVar = typeof REQUIRED_ENV_VARS[number]

const NODE_ENV_VALUES = ['development', 'production', 'test'] as const
const MINIMAX_REGION_VALUES = ['domestic', 'international'] as const
const LOG_LEVEL_VALUES = ['debug', 'info', 'warn', 'error'] as const

type NodeEnv = typeof NODE_ENV_VALUES[number]
type MiniMaxRegion = typeof MINIMAX_REGION_VALUES[number]
type LogLevel = typeof LOG_LEVEL_VALUES[number]

// ============================================================================
// JWT_SECRET Validation (Fail-Fast)
// ============================================================================

const JWT_SECRET_MIN_LENGTH = 32

export function validateJwtSecret(): string {
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

  return jwtSecret
}

// ============================================================================
// MEDIA_TOKEN_SECRET Validation (Fail-Fast)
// ============================================================================

const MEDIA_TOKEN_SECRET_MIN_LENGTH = 32

export function validateMediaTokenSecret(): string {
  const mediaTokenSecret = process.env.MEDIA_TOKEN_SECRET

  if (!mediaTokenSecret) {
    throw new Error(
      'MEDIA_TOKEN_SECRET environment variable is required. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }

  if (mediaTokenSecret.length < MEDIA_TOKEN_SECRET_MIN_LENGTH) {
    throw new Error(
      `MEDIA_TOKEN_SECRET must be at least ${MEDIA_TOKEN_SECRET_MIN_LENGTH} characters (got ${mediaTokenSecret.length}). ` +
      'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }

  return mediaTokenSecret
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

function isAllowedValue<TValue extends string>(value: string, allowedValues: readonly TValue[]): value is TValue {
  return allowedValues.some(allowedValue => allowedValue === value)
}

function parseRequiredEnumValue<TValue extends string>(
  varName: string,
  value: string,
  allowedValues: readonly TValue[]
): TValue {
  if (isAllowedValue(value, allowedValues)) {
    return value
  }

  throw new Error(`${varName} must be one of: ${allowedValues.join(', ')} (got ${value})`)
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  if (value === undefined || value === '') return 'development'
  return parseRequiredEnumValue('NODE_ENV', value, NODE_ENV_VALUES)
}

function parseMiniMaxRegion(value: string | undefined): MiniMaxRegion {
  if (value === undefined || value === '') return 'international'
  return parseRequiredEnumValue('MINIMAX_REGION', value, MINIMAX_REGION_VALUES)
}

function parseLogLevel(value: string | undefined): LogLevel {
  if (value === undefined || value === '') return 'info'
  return parseRequiredEnumValue('LOG_LEVEL', value, LOG_LEVEL_VALUES)
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
  const jwtSecret = validateJwtSecret()
  const mediaTokenSecret = validateMediaTokenSecret()
  const nodeEnv = parseNodeEnv(process.env.NODE_ENV)

  if (nodeEnv !== 'test') {
    validateRequiredEnvVars()
  }

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
      jwtSecret,
      mediaTokenSecret,
      bcryptRounds: parseInteger(process.env.BCRYPT_ROUNDS, 12),
    },
    minimax: {
      apiKey: process.env.MINIMAX_API_KEY,
      region: parseMiniMaxRegion(process.env.MINIMAX_REGION),
    },
    cron: {
      timezone: process.env.CRON_TIMEZONE || 'Asia/Shanghai',
      maxConcurrent: parseInteger(process.env.CRON_MAX_CONCURRENT, 5),
    },
    logging: {
      level: parseLogLevel(process.env.LOG_LEVEL),
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

/**
 * 当前是否为生产环境。
 * 
 * 仅在 NODE_ENV === 'production' 时返回 true。
 * test/development 环境下返回 false（开发调试时需看到完整错误信息）。
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}
