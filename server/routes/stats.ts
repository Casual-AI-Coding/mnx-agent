import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service-async.js'

const router = Router()

router.get('/overview', asyncHandler(async (_req, res) => {
  const db = await getDatabase()
  const overview = await db.getExecutionStatsOverview()
  res.json({ success: true, data: overview })
}))

router.get('/success-rate', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const period = (req.query.period as 'day' | 'week' | 'month') || 'day'
  const validPeriods = ['day', 'week', 'month']
  if (!validPeriods.includes(period)) {
    res.status(400).json({ success: false, error: 'Invalid period. Use day, week, or month' })
    return
  }
  const trend = await db.getExecutionStatsTrend(period)
  res.json({ success: true, data: trend })
}))

router.get('/distribution', asyncHandler(async (_req, res) => {
  const db = await getDatabase()
  const distribution = await db.getExecutionStatsDistribution()
  res.json({ success: true, data: distribution })
}))

router.get('/errors', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100)
  const errors = await db.getExecutionStatsErrors(limit)
  res.json({ success: true, data: errors })
}))

export default router