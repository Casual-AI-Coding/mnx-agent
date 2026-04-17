import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabaseService } from '../service-registration.js'
import { getOwnerId } from '../middleware/data-isolation.js'
import { successResponse, errorResponse } from '../middleware/api-response'
import { getConnection, PostgresConnection } from '../database/connection.js'

const router = Router()

router.get('/overview', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = getOwnerId(req)
  const overview = await db.getExecutionStatsOverview(ownerId)
  successResponse(res, overview)
}))

router.get('/success-rate', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
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
  const db = getDatabaseService()
  const ownerId = getOwnerId(req)
  const distribution = await db.getExecutionStatsDistribution(ownerId)
  successResponse(res, distribution)
}))

router.get('/errors', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = getOwnerId(req)
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100)
  const errors = await db.getExecutionStatsErrors(limit, ownerId)
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
  
  const pgConn = conn as PostgresConnection
  const stats = pgConn.getPoolStats()
  
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