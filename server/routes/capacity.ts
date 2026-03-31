import { Router, Request, Response } from 'express'
import { getDatabase } from '../database/service'
import { getMiniMaxClient, createMiniMaxClientFromHeaders } from '../lib/minimax'

const router = Router()
const db = getDatabase()

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((error: Error & { code?: number }) => {
      const statusCode = error.code && error.code >= 100 && error.code < 600 ? error.code : 500
      res.status(statusCode).json({ success: false, error: error.message })
    })
  }
}

router.get('/', asyncHandler(async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] as string | undefined
    const region = req.headers['x-region'] as string | undefined
    
    const hasValidApiKey = apiKey && apiKey.trim().length > 0
    const client = hasValidApiKey 
      ? createMiniMaxClientFromHeaders(apiKey!.trim(), region)
      : getMiniMaxClient()
    
    const codingPlan = await client.getCodingPlanRemains()
    const records = db.getAllCapacityRecords()
    res.json({ success: true, data: { codingPlan, records } })
  } catch (error) {
    const records = db.getAllCapacityRecords()
    res.json({ 
      success: true, 
      data: { 
        codingPlan: { error: (error as Error).message }, 
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
    for (const [serviceType, config] of Object.entries(rateLimits)) {
      db.upsertCapacityRecord(serviceType, {
        remaining_quota: config.rpm,
        total_quota: config.rpm,
        reset_at: resetAt,
      })
    }
    const records = db.getAllCapacityRecords()
    res.json({ success: true, data: { codingPlan, records } })
  } catch (error) {
    res.status(503).json({ success: false, error: (error as Error).message })
  }
}))

export default router