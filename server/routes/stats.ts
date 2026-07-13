import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { authenticateJWT } from '../middleware/auth-middleware'
import { getDatabasePoolStatsService, getLogService } from '../service-registration.js'
import { getOwnerId } from '../middleware/data-isolation.js'
import { successResponse, errorResponse } from '../middleware/api-response'

const router = Router()
const validPeriods = ['day', 'week', 'month'] as const

type StatsPeriod = typeof validPeriods[number]

function isStatsPeriod(value: string): value is StatsPeriod {
  return validPeriods.some(period => period === value)
}

router.use(authenticateJWT)

router.get('/overview', asyncHandler(async (req, res) => {
  const logService = getLogService()
  const ownerId = getOwnerId(req)
  const overview = await logService.getExecutionStatsOverview(ownerId)
  successResponse(res, overview)
}))

router.get('/success-rate', asyncHandler(async (req, res) => {
  const logService = getLogService()
  const ownerId = getOwnerId(req)
  const period = typeof req.query.period === 'string' ? req.query.period : 'day'
  if (!isStatsPeriod(period)) {
    errorResponse(res, 'Invalid period. Use day, week, or month', 400)
    return
  }
  const trend = await logService.getExecutionStatsTrend(period, ownerId)
  successResponse(res, trend)
}))

router.get('/distribution', asyncHandler(async (req, res) => {
  const logService = getLogService()
  const ownerId = getOwnerId(req)
  const distribution = await logService.getExecutionStatsDistribution(ownerId)
  successResponse(res, distribution)
}))

router.get('/errors', asyncHandler(async (req, res) => {
  const logService = getLogService()
  const ownerId = getOwnerId(req)
  const limitQuery = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 10
  const limit = Math.min(Number.isNaN(limitQuery) ? 10 : limitQuery, 100)
  const errors = await logService.getExecutionStatsErrors(limit, ownerId)
  successResponse(res, errors)
}))

router.get('/pool-stats', asyncHandler(async (_req, res) => {
  const report = getDatabasePoolStatsService().getReport()
  if (!report) {
    errorResponse(res, 'Pool stats only available for PostgreSQL', 400)
    return
  }

  successResponse(res, report)
}))

export default router
