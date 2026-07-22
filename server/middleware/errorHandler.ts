import { Request, Response, NextFunction } from 'express'
import { getLogger } from '../lib/logger'
import { isProduction } from '../config/index.js'
import { captureServerException } from '../lib/error-tracking.js'
import { getCurrentTraceId } from '../services/audit-context.service.js'
import { pickHttpStatusCode, pickHttpErrorMessage, toErrorInstance } from './http-error.js'

const logger = getLogger()

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error({ msg: 'Error:', error: err.message })

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500

  if (statusCode >= 500) {
    const traceId = getCurrentTraceId() ?? undefined
    captureServerException(err, {
      method: req.method,
      path: req.path,
      statusCode,
      traceId,
      userId: req.user?.userId,
    })
  }

  // 4xx 为用户错误，生产环境应保留具体信息；仅 5xx 隐藏详情
  res.status(statusCode).json({
    success: false,
    error: isProduction() && statusCode >= 500 ? 'Internal server error' : err.message,
  })
}

/**
 * 在非 Express 错误中间件路径中统一返回错误响应（4xx 保留错误信息，仅 5xx 在生产环境隐藏）。
 * 优先识别 error.status（ADR-0007 Phase A），然后回退到 error.code，默认 500。
 */
export function handleApiError(req: Request, res: Response, error: unknown): void {
  const statusCode = pickHttpStatusCode(error)

  if (statusCode >= 500) {
    const traceId = getCurrentTraceId() ?? undefined
    captureServerException(toErrorInstance(error), {
      method: req.method,
      path: req.path,
      statusCode,
      traceId,
      userId: req.user?.userId,
    })
  }

  const errorMessage = isProduction() && statusCode >= 500
    ? 'Internal server error'
    : pickHttpErrorMessage(error)

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
  })
}
