import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service-async.js'
import { getClientFromRequest } from '../lib/minimax-client-factory.js'
import { getLogger } from '../lib/logger'
import { successResponse, errorResponse } from '../middleware/api-response'

const logger = getLogger()

const router = Router()

router.get('/', asyncHandler(async (req, res) => {
  try {
    const client = getClientFromRequest(req)
    
    const db = await getDatabase()
    const codingPlan = await client.getCodingPlanRemains()
    const records = await db.getAllCapacityRecords()
    successResponse(res, { codingPlan, records })
  } catch (error) {
    const db = await getDatabase()
    const records = await db.getAllCapacityRecords()
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
    const resetAt = new Date(now.getTime() + 60000).toISOString()
    const rateLimits: Record<string, { rpm: number }> = {
      text: { rpm: 500 },
      voice_sync: { rpm: 60 },
      voice_async: { rpm: 60 },
      image: { rpm: 10 },
      music: { rpm: 10 },
      video: { rpm: 5 },
    }
    const db = await getDatabase()
    for (const [serviceType, config] of Object.entries(rateLimits)) {
      await db.upsertCapacityRecord(serviceType, {
        remaining_quota: config.rpm,
        total_quota: config.rpm,
        reset_at: resetAt,
      })
    }
    const records = await db.getAllCapacityRecords()
    successResponse(res, { codingPlan, records })
  } catch (error) {
    errorResponse(res, (error as Error).message, 503)
  }
}))

export default router