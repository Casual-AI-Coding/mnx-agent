import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { getCapacityService } from '../service-registration.js'
import { getClientFromRequest } from '../lib/minimax-client-factory.js'
import { getLogger } from '../lib/logger'
import { toLocalISODateString } from '../lib/date-utils.js'
import { successResponse, errorResponse } from '../middleware/api-response'

const logger = getLogger()

const router = Router()

router.get('/', asyncHandler(async (req, res) => {
  try {
    const client = getClientFromRequest(req)
    
    const capacityService = getCapacityService()
    const codingPlan = await client.getCodingPlanRemains()
    const records = await capacityService.getAll()
    successResponse(res, { codingPlan, records })
  } catch (error) {
    const capacityService = getCapacityService()
    const records = await capacityService.getAll()
    const errorMessage = (error as Error).message
    logger.error({ msg: 'Failed to fetch coding plan', error: errorMessage })
    res.json({ 
      success: false, 
      error: errorMessage,
      data: { 
        codingPlan: { error: errorMessage }, 
        records 
      } 
    })
  }
}))

router.post('/refresh', asyncHandler(async (req, res) => {
  try {
    const client = getClientFromRequest(req)
    
    const codingPlan = await client.getCodingPlanRemains()
    const now = new Date()
    const resetAt = toLocalISODateString(new Date(now.getTime() + 60000))
    const rateLimits: Record<string, { rpm: number }> = {
      text: { rpm: 500 },
      voice_sync: { rpm: 60 },
      voice_async: { rpm: 60 },
      image: { rpm: 10 },
      music: { rpm: 10 },
      video: { rpm: 5 },
    }
    const capacityService = getCapacityService()
    for (const [serviceType, config] of Object.entries(rateLimits)) {
      await capacityService.upsert(serviceType, {
        remaining_quota: config.rpm,
        total_quota: config.rpm,
        reset_at: resetAt,
      })
    }
    const records = await capacityService.getAll()
    successResponse(res, { codingPlan, records })
  } catch (error) {
    errorResponse(res, (error as Error).message, 503)
  }
}))

export default router