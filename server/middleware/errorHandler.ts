import { Request, Response, NextFunction } from 'express'

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('Error:', err.message)

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500

  res.status(statusCode).json({
    success: false,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  })
}

export function handleApiError(res: Response, error: unknown): void {
  const err = error as Error & { code?: number }
  const statusCode = err.code && err.code >= 100 && err.code < 600 ? err.code : 500
  res.status(statusCode).json({ success: false, error: err.message })
}