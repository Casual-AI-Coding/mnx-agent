/**
 * Rate Limit Configuration Constants
 * 
 * Centralizes all rate limit settings for MiniMax API services.
 * Based on MiniMax API documentation and usage guidelines.
 */

/**
 * API Rate Limits (requests per minute)
 * 
 * These limits are based on MiniMax API tier limits.
 * Adjust according to your API subscription level.
 */
export const API_RATE_LIMITS = {
  /** Text/Chat API rate limit */
  TEXT_RPM: 500,
  /** Synchronous voice synthesis rate limit */
  VOICE_SYNC_RPM: 60,
  /** Asynchronous voice synthesis rate limit */
  VOICE_ASYNC_RPM: 60,
  /** Image generation rate limit */
  IMAGE_RPM: 10,
  /** Music generation rate limit */
  MUSIC_RPM: 10,
  /** Video generation rate limit */
  VIDEO_RPM: 5,
} as const

/**
 * Rate limit configuration by service type
 */
export const RATE_LIMITS_BY_SERVICE: Record<string, { rpm: number }> = {
  text: { rpm: API_RATE_LIMITS.TEXT_RPM },
  voice_sync: { rpm: API_RATE_LIMITS.VOICE_SYNC_RPM },
  voice_async: { rpm: API_RATE_LIMITS.VOICE_ASYNC_RPM },
  image: { rpm: API_RATE_LIMITS.IMAGE_RPM },
  music: { rpm: API_RATE_LIMITS.MUSIC_RPM },
  video: { rpm: API_RATE_LIMITS.VIDEO_RPM },
} as const

/**
 * Webhook rate limiting
 */
export const WEBHOOK_RATE_LIMITS = {
  /** Maximum webhook deliveries per minute per webhook config */
  PER_MINUTE: 100,
  /** Rate limit window in milliseconds (1 minute) */
  WINDOW_MS: 60000,
} as const

/**
 * Get rate limit for a service type
 */
export function getRateLimitForService(serviceType: string): number {
  return RATE_LIMITS_BY_SERVICE[serviceType]?.rpm ?? 100
}