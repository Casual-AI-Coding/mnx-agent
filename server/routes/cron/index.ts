import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { successResponse, errorResponse } from '../../middleware/api-response'
import { getDatabase } from '../../database/service-async.js'
import { getCronSchedulerService } from '../../service-registration.js'
import jobsRouter from './jobs'
import queueRouter from './queue'
import logsRouter from './logs'
import webhooksRouter from './webhooks'

const router = Router()

router.get('/health', asyncHandler(async (_req, res) => {
  try {
    const db = await getDatabase()
    const scheduler = getCronSchedulerService()

    const taskCounts = await db.getTaskCountsByStatus()

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      scheduler: {
        jobsScheduled: scheduler.getJobCount(),
        jobsRunning: scheduler.getRunningJobCount(),
        timezone: scheduler.getTimezone(),
      },
      database: {
        connected: await db.isConnected(),
      },
      queue: {
        pending: taskCounts.pending,
        running: taskCounts.running,
        failed: taskCounts.failed,
      },
    }
    successResponse(res, health)
  } catch (error) {
    errorResponse(res, 'Health check failed', 500)
  }
}))

router.use(jobsRouter)
router.use(queueRouter)
router.use(logsRouter)
router.use(webhooksRouter)

export default router
