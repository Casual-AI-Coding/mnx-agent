import type { Request, Response, NextFunction } from 'express'
import { getLogger } from '../lib/logger'
import { getCurrentTraceId } from '../services/audit-context.service.js'
import { v4 as uuidv4 } from 'uuid'

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const logger = getLogger()
  const startTime = Date.now()
  const requestId = uuidv4()
  const traceId = getCurrentTraceId()

  logger.info({
    type: 'request',
    requestId,
    traceId,
    method: req.method,
    url: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })

  res.on('finish', () => {
    const duration = Date.now() - startTime

    logger.info({
      type: 'response',
      requestId,
      traceId,
      method: req.method,
      url: req.path,
      statusCode: res.statusCode,
      duration,
    })
  })

  next()
}

export function errorLogger(err: Error, req: Request, _res: Response, next: NextFunction): void {
  const logger = getLogger()
  logger.error({
    type: 'error',
    traceId: getCurrentTraceId(),
    method: req.method,
    url: req.path,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  })

  next(err)
}
