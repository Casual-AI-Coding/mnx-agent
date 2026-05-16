import { Request, Response, NextFunction } from 'express'
import { getLogger } from '../lib/logger'
import { isProduction } from '../config/index.js'

const logger = getLogger()

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error({ msg: 'Error:', error: err.message })

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500

  // 4xx 为用户错误，生产环境应保留具体信息；仅 5xx 隐藏详情
  res.status(statusCode).json({
    success: false,
    error: isProduction() && statusCode >= 500 ? 'Internal server error' : err.message,
  })
}

export function handleApiError(res: Response, error: unknown): void {
  const statusCode = error instanceof Error && 'code' in error && typeof error.code === 'number' && error.code >= 100 && error.code < 600
    ? error.code
    : 500

  res.status(statusCode).json({
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
  })
}
