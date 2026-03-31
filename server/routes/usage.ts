import { Router, Request, Response } from 'express'
import { getMiniMaxClient } from '../lib/minimax'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const result = await client.getBalance()
    res.json({ success: true, data: result })
  } catch (error) {
    const err = error as Error & { code?: number }
    const statusCode = err.code && err.code >= 100 && err.code < 600 ? err.code : 500
    res.status(statusCode).json({ success: false, error: err.message })
  }
})

export default router