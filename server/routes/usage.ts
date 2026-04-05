import { Router, Request, Response } from 'express'
import { getMiniMaxClient } from '../lib/minimax'
import { handleApiError } from '../middleware/errorHandler'
import { successResponse } from '../middleware/api-response'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const client = getMiniMaxClient()
    const result = await client.getBalance()
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router