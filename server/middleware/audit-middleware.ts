import type { Request, Response, NextFunction } from 'express'
import { getDatabase } from '../database/service-async.js'
import type { AuditAction } from '../database/types'
import { getLogger } from '../lib/logger'

const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'api_key', 'secret', 'authorization', 'cookie']

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

const SKIP_PATHS = [
  '/cron/health',
  '/ws',
  '/api/health',
]

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const shouldSkip = SKIP_PATHS.some(path => req.path.startsWith(path)) || !shouldAudit(req.method)
  if (shouldSkip) {
    return next()
  }

  const startTime = Date.now()

  const originalEnd = res.end
  res.end = function (this: Response, ...args: Parameters<typeof res.end>) {
    const duration = Date.now() - startTime

    // Fire-and-forget async audit logging - don't block the response
    getDatabase()
      .then(db => {
        const resourceType = extractResourceType(req.path)
        const resourceId = req.params.id || req.params.jobId || null

        const requestBody = req.body && Object.keys(req.body).length > 0
          ? JSON.stringify(redactSensitiveData(req.body))
          : null

        return db.createAuditLog({
          action: methodToAction(req.method),
          resource_type: resourceType,
          resource_id: resourceId,
          user_id: null,
          ip_address: req.ip || null,
          user_agent: req.get('user-agent') || null,
          request_method: req.method,
          request_path: req.originalUrl,
          request_body: requestBody,
          response_status: res.statusCode,
          duration_ms: duration,
        })
      })
      .catch(error => {
        // Fallback: write to log file if database write fails
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

    // Always call originalEnd, even if audit logging failed
    try {
      return originalEnd.apply(this, args)
    } catch (endError) {
      // If res.end itself fails, log and re-throw so Express can handle it
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