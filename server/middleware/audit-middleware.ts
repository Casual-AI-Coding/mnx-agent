import type { Request, Response, NextFunction } from 'express'
import { getDatabaseService } from '../service-registration.js'
import type { AuditAction } from '../database/types'
import { getLogger } from '../lib/logger'
import { getCurrentTraceId } from '../services/audit-context.service.js'
import {
  SENSITIVE_FIELDS,
  MAX_RESPONSE_BODY_LENGTH,
  EXACT_SKIP_PATHS,
  REGEX_SKIP_PATHS,
  RESOURCE_TYPE_MAP,
  ACTION_VERBS,
  UUID_PATTERN,
  NUMERIC_PATTERN,
} from '../config/audit.js'

function getClientIp(req: Request): string | null {
  const forwardedFor = req.get('X-Forwarded-For')
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim())
    if (ips.length > 0 && ips[0]) {
      return ips[0]
    }
  }

  const realIp = req.get('X-Real-IP')
  if (realIp) {
    return realIp
  }

  return req.ip || null
}

function redactSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item))
  }

  const redacted: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value)
    } else {
      redacted[key] = value
    }
  }
  return redacted
}

function shouldAudit(method: string): boolean {
  const auditableMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  return auditableMethods.includes(method.toUpperCase())
}

function methodToAction(method: string): AuditAction {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'create'
    case 'PUT':
    case 'PATCH':
      return 'update'
    case 'DELETE':
      return 'delete'
    default:
      return 'execute'
  }
}

function extractResourceType(path: string): string {
  for (const [prefix, type] of Object.entries(RESOURCE_TYPE_MAP)) {
    if (path.startsWith(prefix)) {
      return type
    }
  }

  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0) return 'unknown'

  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i]
    if (UUID_PATTERN.test(segment) || NUMERIC_PATTERN.test(segment)) continue
    if (ACTION_VERBS.some(verb => segment === verb || segment.includes(verb))) continue
    if (segment.startsWith(':')) continue

    return segment.replace(/s$/, '').replace(/-/g, '_')
  }

  return 'unknown'
}

function shouldSkipAudit(path: string): boolean {
  if ((EXACT_SKIP_PATHS as readonly string[]).includes(path)) return true
  if (REGEX_SKIP_PATHS.some(regex => regex.test(path))) return true
  return false
}

function truncateResponseBody(body: unknown, maxSize: number): string | null {
  if (body === null || body === undefined) return null
  
  const str = typeof body === 'string' ? body : JSON.stringify(body)
  if (str.length > maxSize) {
    return str.substring(0, maxSize) + '...[truncated]'
  }
  return str
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (shouldSkipAudit(req.path) || !shouldAudit(req.method)) {
    return next()
  }

  const startTime = Date.now()
  let responseBody: unknown = null

  const originalJson = res.json
  res.json = function (this: Response, body: unknown): Response {
    responseBody = body
    return originalJson.call(this, body)
  }

  const originalEnd = res.end
  res.end = function (this: Response, ...args: Parameters<typeof res.end>) {
    const duration = Date.now() - startTime

    const db = getDatabaseService()
    const resourceType = extractResourceType(req.path)
    const resourceId = req.params.id || req.params.jobId || null

    const requestBody = req.body && Object.keys(req.body).length > 0
      ? JSON.stringify(redactSensitiveData(req.body))
      : null

    const queryParams = req.query && Object.keys(req.query).length > 0
      ? redactSensitiveData(req.query) as Record<string, unknown>
      : null

    const truncatedResponseBody = truncateResponseBody(responseBody, MAX_RESPONSE_BODY_LENGTH)

    let errorMessage: string | null = null
    if (res.statusCode >= 400 && responseBody) {
      if (typeof responseBody === 'object' && responseBody !== null) {
        const body = responseBody as Record<string, unknown>
        errorMessage = (body.error as string) || (body.message as string) || null
      }
    }

    const traceId = getCurrentTraceId()

    db.createAuditLog({
      action: methodToAction(req.method),
      resource_type: resourceType,
      resource_id: resourceId,
      user_id: req.user?.userId ?? null,
      ip_address: getClientIp(req),
      user_agent: req.get('user-agent') || null,
      request_method: req.method,
      request_path: req.originalUrl,
      request_body: requestBody,
      query_params: queryParams,
      response_body: truncatedResponseBody,
      response_status: res.statusCode,
      error_message: errorMessage,
      duration_ms: duration,
      trace_id: traceId,
    }).catch(error => {
      const logger = getLogger()
      logger.error({
        type: 'audit_log_failure',
        error: (error as Error).message,
        stack: (error as Error).stack,
        request: {
          method: req.method,
          path: req.originalUrl,
          ip: req.ip,
        },
        response: {
          statusCode: res.statusCode,
          duration,
        },
      })
    })

    try {
      return originalEnd.apply(this, args)
    } catch (endError) {
      const logger = getLogger()
      logger.error({
        type: 'response_end_error',
        error: (endError as Error).message,
        stack: (endError as Error).stack,
      })
      throw endError
    }
  } as typeof res.end

  next()
}