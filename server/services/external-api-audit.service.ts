/**
 * External API Audit Service
 * 
 * 提供外部 API 调用审计的 wrapper 函数
 */

import type { ServiceProvider, ExternalApiStatus, CreateExternalApiLog } from '../database/types.js'
import { getAuditContext, getCurrentUserId, getCurrentTraceId } from './audit-context.service.js'
import { getDatabase } from '../database/service-async.js'
import { ExternalApiLogRepository } from '../repositories/external-api-log.repository.js'
import { getLogger } from '../lib/logger.js'

const logger = getLogger()
const MAX_RESPONSE_BODY_SIZE = 4096 // 4KB

/**
 * 敏感字段列表（用于脱敏）
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'access_token',
  'refresh_token',
]

/**
 * 截断响应体
 */
function truncateResponseBody(body: unknown, maxSize: number): string | null {
  if (body === null || body === undefined) return null
  const str = typeof body === 'string' ? body : JSON.stringify(body)
  if (str.length > maxSize) {
    return str.substring(0, maxSize) + '...[truncated]'
  }
  return str
}

/**
 * 脱敏敏感数据
 */
function sanitizeSensitiveData(data: unknown): Record<string, unknown> | null {
  if (data === null || data === undefined) return null
  if (typeof data !== 'object') return { value: data }

  const sanitized: Record<string, unknown> = {}
  const obj = data as Record<string, unknown>

  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]'
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeSensitiveData(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * 外部 API 审计 wrapper（入库）
 * 
 * 用于生成/操作接口，记录完整调用日志到数据库
 */
export function withExternalApiAudit<T>(
  serviceProvider: ServiceProvider,
  apiEndpoint: string,
  operation: string,
  fn: T
): T {
  return (async (...args: unknown[]) => {
    const startTime = Date.now()
    const userId = getCurrentUserId()
    const traceId = getCurrentTraceId()
    const sanitizedParams = args.length > 0 ? sanitizeSensitiveData(args[0]) : null

    try {
      const result = await (fn as (...args: unknown[]) => Promise<unknown>)(...args)
      const durationMs = Date.now() - startTime

      // 写入审计日志
      await writeExternalApiLog({
        service_provider: serviceProvider,
        api_endpoint: apiEndpoint,
        operation,
        request_params: sanitizedParams,
        response_body: truncateResponseBody(result, MAX_RESPONSE_BODY_SIZE),
        status: 'success' as ExternalApiStatus,
        duration_ms: durationMs,
        user_id: userId,
        trace_id: traceId,
      })

      return result
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      // 写入失败日志
      await writeExternalApiLog({
        service_provider: serviceProvider,
        api_endpoint: apiEndpoint,
        operation,
        request_params: sanitizedParams,
        status: 'failed' as ExternalApiStatus,
        error_message: errorMessage,
        duration_ms: durationMs,
        user_id: userId,
        trace_id: traceId,
      })

      throw error
    }
  }) as T
}

/**
 * 外部 API 日志 wrapper（仅 console log，不入库）
 * 
 * 用于查询接口，仅记录 console 日志
 */
export function withExternalApiLog<T>(
  serviceProvider: ServiceProvider,
  apiEndpoint: string,
  operation: string,
  fn: T
): T {
  return (async (...args: unknown[]) => {
    const startTime = Date.now()
    const userId = getCurrentUserId()

    logger.info('[ExternalAPI] %s %s - operation: %s, user_id: %s, started',
      serviceProvider, apiEndpoint, operation, userId ?? 'anonymous')

    try {
      const result = await (fn as (...args: unknown[]) => Promise<unknown>)(...args)
      const durationMs = Date.now() - startTime

      logger.info('[ExternalAPI] %s %s - operation: %s, duration_ms: %d, status: success',
        serviceProvider, apiEndpoint, operation, durationMs)

      return result
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      logger.error('[ExternalAPI] %s %s - operation: %s, duration_ms: %d, error: %s',
        serviceProvider, apiEndpoint, operation, durationMs, errorMessage)

      throw error
    }
  }) as T
}

/**
 * 写入外部 API 调用日志到数据库
 */
async function writeExternalApiLog(data: CreateExternalApiLog): Promise<void> {
  try {
    const db = await getDatabase()
    const repository = new ExternalApiLogRepository(db.getConnection())
    await repository.create(data)
  } catch (error) {
    // 日志写入失败不应影响业务流程，仅记录错误
    logger.error('[ExternalAPIAudit] Failed to write external API log: %s',
      error instanceof Error ? error.message : String(error))
  }
}

/**
 * 获取当前审计上下文（便捷方法）
 */
export function getAuditContextInfo(): { userId: string | null; traceId: string | null } {
  const context = getAuditContext()
  return {
    userId: context?.userId ?? null,
    traceId: context?.traceId ?? null,
  }
}