import type { Request, Response, NextFunction } from 'express'
import { getLogger } from '../lib/logger'

const logger = getLogger()

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now()
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  logger.info({
    type: 'request',
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })

  const originalEnd = res.end
  res.end = function (this: Response, ...args: Parameters<typeof res.end>) {
    const duration = Date.now() - startTime
    
    logger.info({
      type: 'response',
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
    })

    return originalEnd.apply(this, args)
  } as typeof res.end

  next()
}

export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction): void {
  logger.error({
    type: 'error',
    method: req.method,
    url: req.originalUrl,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  })

  next(err)
}