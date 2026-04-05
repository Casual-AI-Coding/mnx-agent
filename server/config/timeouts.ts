/**
 * Timeout Configuration Constants
 * 
 * Centralizes all timeout-related constants used across the application.
 * Extracted from scattered hardcoded values for maintainability.
 */

/**
 * Task execution timeouts (in milliseconds)
 */
export const TASK_TIMEOUTS = {
  /** Default timeout for synchronous tasks (5 minutes) */
  SYNC_TASK_MS: 5 * 60 * 1000,
  /** Timeout for asynchronous tasks with polling (10 minutes) */
  ASYNC_TASK_MS: 10 * 60 * 1000,
  /** Default timeout for cron job execution (5 minutes) */
  DEFAULT_CRON_MS: 5 * 60 * 1000,
  /** Default timeout for workflow node execution */
  WORKFLOW_NODE_MS: 5 * 60 * 1000,
} as const

/**
 * Polling configuration for async tasks
 */
export const POLLING_CONFIG = {
  /** Maximum duration for polling operations (10 minutes) */
  MAX_DURATION_MS: 10 * 60 * 1000,
  /** Initial polling interval (3 seconds) */
  INITIAL_INTERVAL_MS: 3 * 1000,
  /** Maximum polling interval (30 seconds) */
  MAX_INTERVAL_MS: 30 * 1000,
  /** Backoff multiplier for exponential polling */
  BACKOFF_MULTIPLIER: 1.5,
} as const

/**
 * WebSocket timeouts (in milliseconds)
 */
export const WEBSOCKET_TIMEOUTS = {
  /** Heartbeat interval (30 seconds) */
  HEARTBEAT_INTERVAL_MS: 30000,
  /** Heartbeat timeout - time to wait for pong response (10 seconds) */
  HEARTBEAT_TIMEOUT_MS: 10000,
  /** Webhook request timeout (10 seconds) */
  WEBHOOK_REQUEST_MS: 10000,
} as const

/**
 * Token and session timeouts (in milliseconds)
 */
export const TOKEN_TIMEOUTS = {
  /** Media token expiry time (1 hour) */
  MEDIA_TOKEN_EXPIRY_MS: 60 * 60 * 1000,
  /** Balance cache TTL (30 seconds) */
  BALANCE_CACHE_TTL_MS: 30000,
} as const

/**
 * Retry configuration (in milliseconds)
 */
export const RETRY_TIMEOUTS = {
  /** Maximum retry delay (5 minutes) */
  MAX_RETRY_DELAY_MS: 5 * 60 * 1000,
  /** Base delay for exponential backoff (1 second) */
  BASE_DELAY_MS: 1000,
  /** Jitter range for retry delays (up to 1 second) */
  JITTER_MS: 1000,
} as const

/**
 * Default timeout for queue operations (5 minutes)
 */
export const DEFAULT_QUEUE_TIMEOUT_MS = 5 * 60 * 1000