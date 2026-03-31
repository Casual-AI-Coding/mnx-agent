import { Router, Request, Response } from 'express'
import { getMiniMaxClient } from '../lib/minimax'
import { handleApiError } from '../middleware/errorHandler'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const result = await client.getBalance()
    res.json({ success: true, data: result })
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router