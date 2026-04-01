import { Request, Response } from 'express'

/**
 * Centralized async handler for Express route handlers.
 * Catches errors and returns consistent { success: false, error: string } responses.
 */
export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
): (req: Request, res: Response) => void {
  return (req: Request, res: Response) => {
    fn(req, res).catch((error: Error & { code?: number }) => {
      const statusCode =
        error.code && error.code >= 100 && error.code < 600 ? error.code : 500
      res.status(statusCode).json({ success: false, error: error.message })
    })
  }
}