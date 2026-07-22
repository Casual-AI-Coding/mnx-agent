import { Request, Response } from 'express'
import { getLogger } from '../lib/logger'
import { isProduction } from '../config/index.js'
import { captureServerException } from '../lib/error-tracking.js'
import { getCurrentTraceId } from '../services/audit-context.service.js'
import { pickHttpStatusCode, pickHttpErrorMessage, pickHttpErrorStack, toErrorInstance } from './http-error.js'

const logger = getLogger()

export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
): (req: Request, res: Response) => void {
  return (req: Request, res: Response) => {
    fn(req, res).catch((error: unknown) => {
      const statusCode = pickHttpStatusCode(error)
      const message = pickHttpErrorMessage(error)

      logger.error({
        msg: 'Route handler error',
        method: req.method,
        path: req.path,
        error: message,
        stack: pickHttpErrorStack(error),
        statusCode,
      })

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

      // 4xx 为用户错误，生产环境应保留具体信息；仅 5xx 隐藏详情
      const errorMessage = isProduction() && statusCode >= 500 ? 'Internal server error' : message

      res.status(statusCode).json({ success: false, error: errorMessage })
    })
  }
}
