import { Router } from 'express'
import { validate, validateParams } from '../../middleware/validate'
import { asyncHandler } from '../../middleware/asyncHandler'
import { successResponse, errorResponse, deletedResponse, createdResponse } from '../../middleware/api-response'
import { getDatabaseService } from '../../service-registration.js'
import { getCronSchedulerService } from '../../service-registration.js'
import { CronExpressionParser } from 'cron-parser'
import {
  createCronJobSchema,
  updateCronJobSchema,
  cronJobIdParamsSchema,
  addJobTagSchema,
  jobTagParamsSchema,
  jobsByTagParamsSchema,
  addJobDependencySchema,
  jobDependencyParamsSchema,
} from '../../validation/cron-schemas'
import { TaskQueueItem } from '../../database/types'
import { buildOwnerFilter, getOwnerIdForInsert } from '../../middleware/data-isolation.js'
import { formatDuration } from './utils'
import { JobService } from '../../services/domain/job.service.js'
import { withEntityNotFound } from '../../utils/index.js'

const router = Router()

router.get('/jobs', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = buildOwnerFilter(req).params[0]
  const jobService = new JobService(db)
  const jobs = await jobService.getAll(ownerId)
  successResponse(res, { jobs, total: jobs.length })
}))

router.post('/jobs', validate(createCronJobSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const scheduler = getCronSchedulerService()
  const jobData = req.body

  if (!jobData.workflow_id) {
    errorResponse(res, 'workflow_id is required', 400)
    return
  }

  const workflow = await db.getWorkflowTemplateById(jobData.workflow_id)
  if (!workflow) {
    errorResponse(res, 'Workflow not found', 404)
    return
  }

  const ownerId = getOwnerIdForInsert(req) ?? undefined
  const job = await jobService.create({
    name: jobData.name,
    description: jobData.description,
    cron_expression: jobData.cron_expression,
    is_active: jobData.is_active,
    workflow_id: jobData.workflow_id,
    timezone: jobData.timezone || 'UTC',
    timeout_ms: jobData.timeout_ms,
  }, ownerId)

  if (job.is_active) {
    await scheduler.scheduleJob(job)
  }

  createdResponse(res, job)
}))

router.get('/jobs/:id', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(job, res, 'Job')) return
  successResponse(res, job)
}))

router.put('/jobs/:id', validateParams(cronJobIdParamsSchema), validate(updateCronJobSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const existingJob = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(existingJob, res, 'Job')) return
  const job = await jobService.update(req.params.id, req.body, ownerId)
  successResponse(res, job)
}))

router.patch('/jobs/:id', validateParams(cronJobIdParamsSchema), validate(updateCronJobSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const existingJob = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(existingJob, res, 'Job')) return
  const job = await jobService.update(req.params.id, req.body, ownerId)
  successResponse(res, job)
}))

router.delete('/jobs/:id', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(job, res, 'Job')) return
  const tasks: TaskQueueItem[] = await db.getTasksByJobId(req.params.id, ownerId)
  for (const task of tasks) {
    await db.deleteTask(task.id, ownerId)
  }
  await jobService.delete(req.params.id, ownerId)
  deletedResponse(res, { tasksDeleted: tasks.length })
}))

router.post('/jobs/:id/run', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const scheduler = getCronSchedulerService()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(job, res, 'Job')) return

  try {
    await scheduler.executeJobTick(job)
    successResponse(res, { message: 'Job triggered successfully' })
  } catch (error) {
    console.error('Manual trigger failed:', error)
    errorResponse(res, `Failed to execute job: ${(error as Error).message}`, 500)
  }
}))

router.post('/jobs/:id/toggle', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const scheduler = getCronSchedulerService()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(job, res, 'Job')) return
  const updatedJob = await jobService.toggle(req.params.id, ownerId)

  if (updatedJob) {
    if (updatedJob.is_active) {
      await scheduler.scheduleJob(updatedJob)
    } else {
      scheduler.unscheduleJob(updatedJob.id)
    }
  }

  successResponse(res, { job: updatedJob, scheduled: updatedJob?.is_active })
}))

router.post('/jobs/:id/clone', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(job, res, 'Job')) return
  
  const clonedJob = await jobService.create({
    name: `${job.name} (Copy)`,
    description: job.description,
    cron_expression: job.cron_expression,
    is_active: false,
    workflow_id: job.workflow_id,
    timezone: job.timezone,
    timeout_ms: job.timeout_ms ?? undefined,
  }, ownerId)
  
  successResponse(res, clonedJob)
}))

router.post('/jobs/:id/dry-run', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(job, res, 'Job')) return
  
  const scheduler = getCronSchedulerService()
  
  const nextRuns: string[] = []
  let validation = { valid: true, errors: [] as string[] }
  try {
    const interval = CronExpressionParser.parse(job.cron_expression, { tz: job.timezone || scheduler.getTimezone() })
    for (let i = 0; i < 5; i++) {
      nextRuns.push(interval.next().toDate().toISOString())
    }
  } catch {
    validation.valid = false
    validation.errors.push('Invalid cron expression')
  }
  
  const recentLogs = await db.getAllExecutionLogs(job.id, 10)
  const avgDuration = recentLogs.length > 0
    ? recentLogs.reduce((sum: number, log) => sum + (log.duration_ms || 0), 0) / recentLogs.length
    : null
  
  successResponse(res, {
    validation,
    nextRuns,
    estimatedDurationMs: avgDuration,
    estimatedDurationFormatted: avgDuration ? formatDuration(avgDuration) : null,
  })
}))

router.post('/jobs/bulk/enable', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const scheduler = getCronSchedulerService()
  const ownerId = buildOwnerFilter(req).params[0]
  const { ids } = req.body
  if (!Array.isArray(ids)) {
    errorResponse(res, 'ids must be an array', 400)
    return
  }
  let updated = 0
  for (const id of ids) {
    const job = await jobService.getById(id, ownerId)
    if (job && !job.is_active) {
      const updatedJob = await jobService.toggle(id, ownerId)
      if (updatedJob) {
        await scheduler.scheduleJob(updatedJob)
      }
      updated++
    }
  }
  successResponse(res, { updated })
}))

router.post('/jobs/bulk/disable', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const scheduler = getCronSchedulerService()
  const ownerId = buildOwnerFilter(req).params[0]
  const { ids } = req.body
  if (!Array.isArray(ids)) {
    errorResponse(res, 'ids must be an array', 400)
    return
  }
  let updated = 0
  for (const id of ids) {
    const job = await jobService.getById(id, ownerId)
    if (job && job.is_active) {
      scheduler.unscheduleJob(id)
      await jobService.toggle(id, ownerId)
      updated++
    }
  }
  successResponse(res, { updated })
}))

router.post('/jobs/bulk/delete', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const scheduler = getCronSchedulerService()
  const ownerId = buildOwnerFilter(req).params[0]
  const { ids } = req.body
  if (!Array.isArray(ids)) {
    errorResponse(res, 'ids must be an array', 400)
    return
  }
  let deleted = 0
  for (const id of ids) {
    scheduler.unscheduleJob(id)
    const job = await jobService.getById(id, ownerId)
    if (job) {
      await jobService.delete(id, ownerId)
      deleted++
    }
  }
  successResponse(res, { deleted })
}))

router.post('/jobs/:id/tags', validateParams(cronJobIdParamsSchema), validate(addJobTagSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(job, res, 'Job')) return
  const { tag } = req.body
  await jobService.addTag(req.params.id, tag)
  const tags = await jobService.getTags(req.params.id)
  successResponse(res, { tags })
}))

router.delete('/jobs/:id/tags/:tag', validateParams(jobTagParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(job, res, 'Job')) return
  await jobService.removeTag(req.params.id, req.params.tag)
  const tags = await jobService.getTags(req.params.id)
  successResponse(res, { tags })
}))

router.get('/jobs/:id/tags', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(job, res, 'Job')) return
  const tags = await jobService.getTags(req.params.id)
  successResponse(res, { tags })
}))

router.get('/tags/:tag/jobs', validateParams(jobsByTagParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const jobs = await jobService.getWithTag(req.params.tag)
  successResponse(res, { jobs, total: jobs.length })
}))

router.get('/tags', asyncHandler(async (_req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const tags = await jobService.getAllTags()
  successResponse(res, { tags })
}))

router.post('/jobs/:id/dependencies', validateParams(cronJobIdParamsSchema), validate(addJobDependencySchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(job, res, 'Job')) return
  const { depends_on_job_id } = req.body

  if (req.params.id === depends_on_job_id) {
    errorResponse(res, 'A job cannot depend on itself', 400)
    return
  }

  const dependsOnJob = await jobService.getById(depends_on_job_id, ownerId)
  if (!withEntityNotFound(dependsOnJob, res, 'Dependent job')) return

  const hasCircular = await jobService.hasCircularDependency(req.params.id, depends_on_job_id)
  if (hasCircular) {
    errorResponse(res, 'Adding this dependency would create a circular dependency', 400)
    return
  }

  await jobService.addDependency(req.params.id, depends_on_job_id)
  const dependencies = await jobService.getDependencies(req.params.id)
  successResponse(res, { dependencies })
}))

router.delete('/jobs/:id/dependencies/:depId', validateParams(jobDependencyParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(job, res, 'Job')) return
  await jobService.removeDependency(req.params.id, req.params.depId)
  const dependencies = await jobService.getDependencies(req.params.id)
  successResponse(res, { dependencies })
}))

router.get('/jobs/:id/dependencies', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(job, res, 'Job')) return
  const dependencies = await jobService.getDependencies(req.params.id)
  successResponse(res, { dependencies })
}))

router.get('/jobs/:id/dependents', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const jobService = new JobService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await jobService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(job, res, 'Job')) return
  const dependents = await jobService.getDependents(req.params.id)
  successResponse(res, { dependents })
}))

export default router
