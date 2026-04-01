import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service-async.js'
import { getMiniMaxClient, createMiniMaxClientFromHeaders } from '../lib/minimax'
import { getLogger } from '../lib/logger'

const logger = getLogger()

const router = Router()

router.get('/', asyncHandler(async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] as string | undefined
    const region = req.headers['x-region'] as string | undefined
    
    const hasValidApiKey = apiKey && apiKey.trim().length > 0
    const client = hasValidApiKey 
      ? createMiniMaxClientFromHeaders(apiKey!.trim(), region)
      : getMiniMaxClient()
    
    const db = await getDatabase()
    const codingPlan = await client.getCodingPlanRemains()
    const records = await db.getAllCapacityRecords()
    res.json({ success: true, data: { codingPlan, records } })
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
    const apiKey = req.headers['x-api-key'] as string | undefined
    const region = req.headers['x-region'] as string | undefined
    
    const hasValidApiKey = apiKey && apiKey.trim().length > 0
    const client = hasValidApiKey 
      ? createMiniMaxClientFromHeaders(apiKey!.trim(), region)
      : getMiniMaxClient()
    
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
    res.json({ success: true, data: { codingPlan, records } })
  } catch (error) {
    res.status(503).json({ success: false, error: (error as Error).message })
  }
}))

export default router