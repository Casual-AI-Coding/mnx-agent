import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service-async.js'
import { buildOwnerFilter } from '../middleware/data-isolation.js'

const router = Router()

router.get('/overview', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const overview = await db.getExecutionStatsOverview(ownerId)
  res.json({ success: true, data: overview })
}))

router.get('/success-rate', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const period = (req.query.period as 'day' | 'week' | 'month') || 'day'
  const validPeriods = ['day', 'week', 'month']
  if (!validPeriods.includes(period)) {
    res.status(400).json({ success: false, error: 'Invalid period. Use day, week, or month' })
    return
  }
  const trend = await db.getExecutionStatsTrend(period, ownerId)
  res.json({ success: true, data: trend })
}))

router.get('/distribution', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const distribution = await db.getExecutionStatsDistribution(ownerId)
  res.json({ success: true, data: distribution })
}))

router.get('/errors', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100)
  const errors = await db.getExecutionStatsErrors(limit, ownerId)
  res.json({ success: true, data: errors })
}))

export default router