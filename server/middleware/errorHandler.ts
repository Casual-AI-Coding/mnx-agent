import { Request, Response, NextFunction } from 'express'
import { getLogger } from '../lib/logger'
import { isProduction } from '../config/index.js'
import { captureServerException } from '../lib/error-tracking.js'
import { getCurrentTraceId } from '../services/audit-context.service.js'

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
 * 工具函数 — 在非 Express 错误中间件路径中统一返回错误响应。
 * 与 asyncHandler/errorHandler 保持相同的 4xx/5xx 差异化策略：
 * 4xx 保留用户可见错误信息，仅 5xx 在生产环境隐藏详情。
 */
export function handleApiError(req: Request, res: Response, error: unknown): void {
  const statusCode = error instanceof Error && 'code' in error && typeof error.code === 'number' && error.code >= 100 && error.code < 600
    ? error.code
    : 500

  if (statusCode >= 500) {
    const traceId = getCurrentTraceId() ?? undefined
    const capturedError = error instanceof Error ? error : new Error('Unknown error')
    captureServerException(capturedError, {
      method: req.method,
      path: req.path,
      statusCode,
      traceId,
      userId: req.user?.userId,
    })
  }

  const errorMessage = isProduction() && statusCode >= 500 ? 'Internal server error' : (error instanceof Error ? error.message : 'Unknown error')

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
  })
}
