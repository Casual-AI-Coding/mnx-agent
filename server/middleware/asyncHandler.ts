import { Request, Response } from 'express'
import { getLogger } from '../lib/logger'

const logger = getLogger()

export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
): (req: Request, res: Response) => void {
  return (req: Request, res: Response) => {
    fn(req, res).catch((error: Error & { code?: number }) => {
      const statusCode =
        error.code && error.code >= 100 && error.code < 600 ? error.code : 500
      
      logger.error({
        msg: 'Route handler error',
        method: req.method,
        path: req.path,
        error: error.message,
        stack: error.stack,
        statusCode,
      })
      
      res.status(statusCode).json({ success: false, error: error.message })
    })
  }
}