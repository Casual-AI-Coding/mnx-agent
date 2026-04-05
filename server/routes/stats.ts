import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service-async.js'
import { getOwnerId } from '../middleware/data-isolation.js'
import { successResponse, errorResponse } from '../middleware/api-response'

const router = Router()

router.get('/overview', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerId(req)
  const overview = await db.getExecutionStatsOverview(ownerId)
  successResponse(res, overview)
}))

router.get('/success-rate', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerId(req)
  const period = (req.query.period as 'day' | 'week' | 'month') || 'day'
  const validPeriods = ['day', 'week', 'month']
  if (!validPeriods.includes(period)) {
    errorResponse(res, 'Invalid period. Use day, week, or month', 400)
    return
  }
  const trend = await db.getExecutionStatsTrend(period, ownerId)
  successResponse(res, trend)
}))

router.get('/distribution', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerId(req)
  const distribution = await db.getExecutionStatsDistribution(ownerId)
  successResponse(res, distribution)
}))

router.get('/errors', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerId(req)
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100)
  const errors = await db.getExecutionStatsErrors(limit, ownerId)
  successResponse(res, errors)
}))

export default router