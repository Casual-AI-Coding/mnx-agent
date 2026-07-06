import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { authenticateJWT } from '../middleware/auth-middleware'
import { getLogService } from '../service-registration.js'
import { getOwnerId } from '../middleware/data-isolation.js'
import { successResponse, errorResponse } from '../middleware/api-response'
import { getConnection, PostgresConnection } from '../database/connection.js'

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

/**
 * Database connection pool status monitoring
 * Returns pool statistics including total, idle, and waiting connections
 * Helpful for diagnosing connection pool exhaustion issues
 */
router.get('/pool-stats', asyncHandler(async (_req, res) => {
  const conn = getConnection()
  
  if (!conn.isPostgres()) {
    errorResponse(res, 'Pool stats only available for PostgreSQL', 400)
    return
  }
  
  if (!(conn instanceof PostgresConnection)) {
    errorResponse(res, 'Pool stats only available for PostgreSQL', 400)
    return
  }

  const stats = conn.getPoolStats()
  
  successResponse(res, {
    pool: stats,
    status: stats.waitingCount > 0 ? 'congested' : 'healthy',
    warning: stats.waitingCount > 0 
      ? `${stats.waitingCount} requests waiting for connection - consider increasing DB_POOL_MAX`
      : null,
    recommendation: stats.waitingCount > 5 
      ? 'Connection pool is under pressure. Consider increasing DB_POOL_MAX environment variable.'
      : null,
  })
}))

export default router
