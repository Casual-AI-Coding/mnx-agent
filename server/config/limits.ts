/**
 * Application Limits Configuration Constants
 * 
 * Centralizes all application-wide limits and thresholds.
 */

/**
 * Connection limits
 */
export const CONNECTION_LIMITS = {
  /** Maximum WebSocket connections */
  MAX_WS_CONNECTIONS: 1000,
} as const

/**
 * Security limits
 */
export const SECURITY_LIMITS = {
  /** Bcrypt hash rounds for password hashing */
  BCRYPT_ROUNDS: 12,
} as const

/**
 * Capacity thresholds
 */
export const CAPACITY_LIMITS = {
  /** Minimum balance threshold to allow task execution (in currency units) */
  MIN_BALANCE_THRESHOLD: 1.0,
} as const

/**
 * Queue limits
 */
export const QUEUE_LIMITS = {
  /** Maximum concurrent job executions */
  MAX_CONCURRENT_JOBS: 5,
  /** Default batch size for queue processing */
  DEFAULT_BATCH_SIZE: 10,
  /** Maximum retry attempts for failed tasks */
  MAX_RETRY_ATTEMPTS: 3,
} as const

/**
 * Pagination limits
 */
export const PAGINATION_LIMITS = {
  /** Default page size */
  DEFAULT_PAGE_SIZE: 20,
  /** Maximum page size */
  MAX_PAGE_SIZE: 100,
} as const

/**
 * Task type to method name mapping
 * Used by TaskExecutor to route task types to MiniMax API methods
 */
export const TASK_TYPE_MAP: Record<string, string> = {
  text: 'chatCompletion',
  voice_sync: 'textToAudioSync',
  voice_async: 'textToAudioAsync',
  image: 'imageGeneration',
  music: 'musicGeneration',
  video: 'videoGeneration',
} as const

/**
 * Valid task types
 */
export const VALID_TASK_TYPES = Object.keys(TASK_TYPE_MAP) as (keyof typeof TASK_TYPE_MAP)[]