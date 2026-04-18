import type { Request, Response, NextFunction } from 'express'
import { getDatabaseService } from '../service-registration.js'
import type { AuditAction } from '../database/types'
import { getLogger } from '../lib/logger'
import { getCurrentTraceId } from '../services/audit-context.service.js'

const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'api_key', 'secret', 'authorization', 'cookie']

const MAX_RESPONSE_BODY_LENGTH = 4096

const EXACT_SKIP_PATHS = [
  '/api/health',
  '/api/text/chat/stream',
  '/api/capacity/refresh',
  '/api/auth/refresh',
  '/api/settings/preferences',
  '/api/settings/display',
  '/api/settings/theme',
]

const REGEX_SKIP_PATHS = [
  /^\/api\/media\/[^/]+\/favorite$/,
  /^\/api\/cron\/jobs\/[^/]+\/tags$/,
  /^\/api\/cron\/jobs\/[^/]+\/tags\/[^/]+$/,
]

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
  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0) return 'unknown'

  let resourceType = segments[segments.length - 1]

  if (resourceType === 'logs' && segments.length >= 2) {
    resourceType = `${segments[segments.length - 2]}_logs`
  }

  resourceType = resourceType.replace(/s$/, '')
  resourceType = resourceType.replace(/-/g, '_')

  return resourceType
}

function shouldSkipAudit(path: string): boolean {
  if (EXACT_SKIP_PATHS.includes(path)) return true
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
      ip_address: req.ip || null,
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