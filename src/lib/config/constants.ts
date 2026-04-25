/**
 * Frontend Configuration Constants
 * 
 * Centralizes all frontend constants.
 * Values should match backend config where applicable.
 */

/**
 * Timeout configuration (in milliseconds)
 * Matches: server/config/timeouts.ts
 */
export const TIMEOUTS = {
  /** Default API request timeout (30 seconds) */
  API_REQUEST: 30000,
  /** Music generation timeout (5 minutes) */
  MUSIC_GENERATION: 300000,
  /** Lyrics generation timeout (1 minute) */
  LYRICS_GENERATION: 60000,
  /** External proxy timeout (5 minutes) */
  EXTERNAL_PROXY: 300000,
  /** Default cron job timeout (5 minutes) */
  DEFAULT_CRON: 300000,
  /** Maximum cron job timeout (10 minutes) */
  MAX_CRON: 600000,
  /** Minimum cron job timeout (1 second) */
  MIN_CRON: 1000,
} as const

/**
 * WebSocket configuration (in milliseconds)
 * Matches: server/config/timeouts.ts WEBSOCKET_TIMEOUTS
 */
export const WEBSOCKET = {
  /** Heartbeat interval (30 seconds) */
  HEARTBEAT_INTERVAL: 30000,
  /** Heartbeat timeout (10 seconds) */
  HEARTBEAT_TIMEOUT: 10000,
  /** Reconnect max delay (30 seconds) */
  RECONNECT_MAX_DELAY: 30000,
} as const

/**
 * Pagination limits
 * Matches: server/config/limits.ts PAGINATION_LIMITS
 */
export const PAGINATION = {
  /** Default page size */
  DEFAULT_PAGE_SIZE: 8,
  /** Maximum page size */
  MAX_PAGE_SIZE: 100,
  /** Page size options for selectors */
  PAGE_SIZE_OPTIONS: [8, 20, 50, 100] as const,
} as const

/**
 * Queue limits
 * Matches: server/config/limits.ts QUEUE_LIMITS
 */
export const QUEUE = {
  /** Maximum concurrent job executions */
  MAX_CONCURRENT_JOBS: 5,
  /** Default batch size for queue processing */
  DEFAULT_BATCH_SIZE: 10,
  /** Maximum retry attempts */
  MAX_RETRY_ATTEMPTS: 3,
} as const

/**
 * Character limits for form inputs
 */
export const CHARACTER_LIMITS = {
  /** Default text input max */
  TEXT_INPUT: 10000,
  /** Prompt max length */
  PROMPT: 5000,
  /** Lyrics max length */
  LYRICS: 10000,
  /** Long text max (for voice, etc.) */
  LONG_TEXT: 50000,
} as const

/**
 * Workflow configuration
 */
export const WORKFLOW = {
  /** Maximum undo history size */
  MAX_HISTORY_SIZE: 50,
  /** Template list limit */
  TEMPLATE_LIST_LIMIT: 50,
} as const