import { Router, Request, Response } from 'express'
import { getClientFromRequest } from '../lib/minimax-client-factory.js'
import { handleApiError } from '../middleware/errorHandler'
import { successResponse } from '../middleware/api-response'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    const result = await client.getBalance()
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})

export default router