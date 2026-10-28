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
 * 动态覆盖（R-015）
 *
 * 服务 RPM 支持通过 system_config（key: ratelimit.service_rpm）在运行时调整，
 * 格式为逗号分隔的 `service=rpm`；未覆盖的服务回退到上方静态默认值。
 * Admin 管理界面读写该配置；容量检查等消费方经 getRateLimitForService 读取。
 */

export const RATE_LIMIT_OVERRIDES_CONFIG_KEY = 'ratelimit.service_rpm'

const RATE_LIMITS_REFRESH_INTERVAL_MS = 60_000

const SERVICE_RPM_PATTERN = /^(text|voice_sync|voice_async|image|music|video)=(\d+)$/
const RPM_MIN = 1
const RPM_MAX = 100_000

type RateLimitConfigProvider = {
  getSystemConfigByKey(key: string): Promise<{ value: string } | null>
}

let overrideRpm: Record<string, number> = {}
let lastRefreshAtMs = 0

/** 解析 `text=500,video=8` 格式的覆盖配置；非法条目抛错 */
export function parseRateLimitOverrides(value: string): Record<string, number> {
  const result: Record<string, number> = {}
  const trimmed = value.trim()
  if (trimmed === '') return result

  for (const part of trimmed.split(',')) {
    const match = SERVICE_RPM_PATTERN.exec(part.trim())
    if (!match) {
      throw new Error(`无效的速率限制条目: "${part.trim()}"（应为 服务=rpm，服务限于 text/voice_sync/voice_async/image/music/video）`)
    }
    const rpm = parseInt(match[2], 10)
    if (rpm < RPM_MIN || rpm > RPM_MAX) {
      throw new Error(`rpm 超出合法范围 [${RPM_MIN}, ${RPM_MAX}]: ${part.trim()}`)
    }
    result[match[1]] = rpm
  }
  return result
}

/** 写入前校验；返回错误消息，null 表示合法 */
export function validateRateLimitOverrides(value: string): string | null {
  try {
    parseRateLimitOverrides(value)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

export function configureRateLimitOverrides(value: string): void {
  overrideRpm = parseRateLimitOverrides(value)
}

export function resetRateLimitOverrides(): void {
  overrideRpm = {}
}

/** 覆盖与默认值合并后的生效视图（管理界面展示用） */
export function getEffectiveServiceRateLimits(): Record<string, { rpm: number; overridden: boolean }> {
  const effective: Record<string, { rpm: number; overridden: boolean }> = {}
  for (const [service, config] of Object.entries(RATE_LIMITS_BY_SERVICE)) {
    effective[service] = { rpm: overrideRpm[service] ?? config.rpm, overridden: overrideRpm[service] !== undefined }
  }
  return effective
}

/** 单服务生效 RPM：覆盖优先，未知服务回退 100 */
export function getRateLimitForService(serviceType: string): number {
  const override = overrideRpm[serviceType]
  if (override !== undefined) return override
  return RATE_LIMITS_BY_SERVICE[serviceType]?.rpm ?? 100
}

function isOverrideStale(now: number): boolean {
  return now - lastRefreshAtMs >= RATE_LIMITS_REFRESH_INTERVAL_MS
}

/** 从 system_config 刷新覆盖配置（TTL 缓存，与代理白名单同模式） */
export async function refreshRateLimitOverridesFromConfig(
  provider: RateLimitConfigProvider
): Promise<void> {
  const config = await provider.getSystemConfigByKey(RATE_LIMIT_OVERRIDES_CONFIG_KEY)
  if (config) {
    configureRateLimitOverrides(config.value)
  } else {
    resetRateLimitOverrides()
  }
  lastRefreshAtMs = Date.now()
}

/** 仅测试使用：重置 TTL 状态与覆盖 */
export function __resetRateLimitsStateForTests(): void {
  overrideRpm = {}
  lastRefreshAtMs = 0
}

/** 过期时才真正拉取配置（消费方热路径调用） */
export async function ensureRateLimitsFresh(provider: RateLimitConfigProvider): Promise<void> {
  if (!isOverrideStale(Date.now())) return
  await refreshRateLimitOverridesFromConfig(provider)
}
