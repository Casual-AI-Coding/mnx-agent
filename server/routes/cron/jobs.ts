import { Router } from 'express'
import { validate, validateParams } from '../../middleware/validate'
import { asyncHandler } from '../../middleware/asyncHandler'
import { successResponse, errorResponse, deletedResponse, createdResponse } from '../../middleware/api-response'
import { getDatabase } from '../../database/service-async.js'
import { getCronScheduler } from '../../services/cron-scheduler'
import { WorkflowEngine } from '../../services/workflow-engine'
import { getServiceNodeRegistry } from '../../services/service-node-registry'
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

const router = Router()

router.get('/jobs', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const jobs = await db.getAllCronJobs(ownerId)
  successResponse(res, { jobs, total: jobs.length })
}))

router.post('/jobs', validate(createCronJobSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const serviceRegistry = getServiceNodeRegistry(db)
  const scheduler = getCronScheduler(db, new WorkflowEngine(db, serviceRegistry))
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
  const job = await db.createCronJob({
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
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    errorResponse(res, 'Job not found', 404)
    return
  }
  successResponse(res, job)
}))

router.put('/jobs/:id', validateParams(cronJobIdParamsSchema), validate(updateCronJobSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const existingJob = await db.getCronJobById(req.params.id, ownerId)
  if (!existingJob) {
    errorResponse(res, 'Job not found', 404)
    return
  }
  const job = await db.updateCronJob(req.params.id, req.body, ownerId)
  successResponse(res, job)
}))

router.patch('/jobs/:id', validateParams(cronJobIdParamsSchema), validate(updateCronJobSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const existingJob = await db.getCronJobById(req.params.id, ownerId)
  if (!existingJob) {
    errorResponse(res, 'Job not found', 404)
    return
  }
  const job = await db.updateCronJob(req.params.id, req.body, ownerId)
  successResponse(res, job)
}))

router.delete('/jobs/:id', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    errorResponse(res, 'Job not found', 404)
    return
  }
  const tasks: TaskQueueItem[] = await db.getTasksByJobId(req.params.id, ownerId)
  for (const task of tasks) {
    await db.deleteTask(task.id, ownerId)
  }
  await db.deleteCronJob(req.params.id, ownerId)
  deletedResponse(res, { tasksDeleted: tasks.length })
}))

router.post('/jobs/:id/run', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const serviceRegistry = getServiceNodeRegistry(db)
  const scheduler = getCronScheduler(db, new WorkflowEngine(db, serviceRegistry))
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    errorResponse(res, 'Job not found', 404)
    return
  }

  try {
    await scheduler.executeJobTick(job)
    successResponse(res, { message: 'Job triggered successfully' })
  } catch (error) {
    console.error('Manual trigger failed:', error)
    errorResponse(res, `Failed to execute job: ${(error as Error).message}`, 500)
  }
}))

router.post('/jobs/:id/toggle', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const serviceRegistry = getServiceNodeRegistry(db)
  const scheduler = getCronScheduler(db, new WorkflowEngine(db, serviceRegistry))
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    errorResponse(res, 'Job not found', 404)
    return
  }
  const updatedJob = await db.toggleCronJobActive(req.params.id, ownerId)

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
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  
  const clonedJob = await db.createCronJob({
    name: `${job.name} (Copy)`,
    description: job.description,
    cron_expression: job.cron_expression,
    is_active: false,
    workflow_id: job.workflow_id,
    timezone: job.timezone,
    timeout_ms: job.timeout_ms ?? undefined,
  }, ownerId)
  
  res.json({ success: true, data: clonedJob })
}))

router.post('/jobs/:id/dry-run', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  
  const serviceRegistry = getServiceNodeRegistry(db)
  const scheduler = getCronScheduler(db, new WorkflowEngine(db, serviceRegistry))
  
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
  
  res.json({
    success: true,
    data: {
      validation,
      nextRuns,
      estimatedDurationMs: avgDuration,
      estimatedDurationFormatted: avgDuration ? formatDuration(avgDuration) : null,
    },
  })
}))

router.post('/jobs/bulk/enable', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const serviceRegistry = getServiceNodeRegistry(db)
  const scheduler = getCronScheduler(db, new WorkflowEngine(db, serviceRegistry))
  const ownerId = buildOwnerFilter(req).params[0]
  const { ids } = req.body
  if (!Array.isArray(ids)) {
    res.status(400).json({ success: false, error: 'ids must be an array' })
    return
  }
  let updated = 0
  for (const id of ids) {
    const job = await db.getCronJobById(id, ownerId)
    if (job && !job.is_active) {
      const updatedJob = await db.toggleCronJobActive(id, ownerId)
      if (updatedJob) {
        await scheduler.scheduleJob(updatedJob)
      }
      updated++
    }
  }
  res.json({ success: true, data: { updated } })
}))

router.post('/jobs/bulk/disable', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const serviceRegistry = getServiceNodeRegistry(db)
  const scheduler = getCronScheduler(db, new WorkflowEngine(db, serviceRegistry))
  const ownerId = buildOwnerFilter(req).params[0]
  const { ids } = req.body
  if (!Array.isArray(ids)) {
    res.status(400).json({ success: false, error: 'ids must be an array' })
    return
  }
  let updated = 0
  for (const id of ids) {
    const job = await db.getCronJobById(id, ownerId)
    if (job && job.is_active) {
      scheduler.unscheduleJob(id)
      await db.toggleCronJobActive(id, ownerId)
      updated++
    }
  }
  res.json({ success: true, data: { updated } })
}))

router.post('/jobs/bulk/delete', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const serviceRegistry = getServiceNodeRegistry(db)
  const scheduler = getCronScheduler(db, new WorkflowEngine(db, serviceRegistry))
  const ownerId = buildOwnerFilter(req).params[0]
  const { ids } = req.body
  if (!Array.isArray(ids)) {
    res.status(400).json({ success: false, error: 'ids must be an array' })
    return
  }
  let deleted = 0
  for (const id of ids) {
    scheduler.unscheduleJob(id)
    if (await db.deleteCronJob(id, ownerId)) {
      deleted++
    }
  }
  res.json({ success: true, data: { deleted } })
}))

router.post('/jobs/:id/tags', validateParams(cronJobIdParamsSchema), validate(addJobTagSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  const { tag } = req.body
  await db.addJobTag(req.params.id, tag)
  const tags = await db.getJobTags(req.params.id)
  res.json({ success: true, data: { tags } })
}))

router.delete('/jobs/:id/tags/:tag', validateParams(jobTagParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  await db.removeJobTag(req.params.id, req.params.tag)
  const tags = await db.getJobTags(req.params.id)
  res.json({ success: true, data: { tags } })
}))

router.get('/jobs/:id/tags', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  const tags = await db.getJobTags(req.params.id)
  res.json({ success: true, data: { tags } })
}))

router.get('/tags/:tag/jobs', validateParams(jobsByTagParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const jobs = await db.getJobsByTag(req.params.tag, ownerId)
  res.json({ success: true, data: { jobs, total: jobs.length } })
}))

router.get('/tags', asyncHandler(async (_req, res) => {
  const db = await getDatabase()
  const tags = await db.getAllTags()
  res.json({ success: true, data: { tags } })
}))

router.post('/jobs/:id/dependencies', validateParams(cronJobIdParamsSchema), validate(addJobDependencySchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  const { depends_on_job_id } = req.body

  if (req.params.id === depends_on_job_id) {
    res.status(400).json({ success: false, error: 'A job cannot depend on itself' })
    return
  }

  const dependsOnJob = await db.getCronJobById(depends_on_job_id, ownerId)
  if (!dependsOnJob) {
    res.status(404).json({ success: false, error: 'Dependent job not found' })
    return
  }

  const hasCircular = await db.hasCircularDependency(req.params.id, depends_on_job_id)
  if (hasCircular) {
    res.status(400).json({ success: false, error: 'Adding this dependency would create a circular dependency' })
    return
  }

  await db.addJobDependency(req.params.id, depends_on_job_id)
  const dependencies = await db.getJobDependencies(req.params.id)
  res.json({ success: true, data: { dependencies } })
}))

router.delete('/jobs/:id/dependencies/:depId', validateParams(jobDependencyParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  await db.removeJobDependency(req.params.id, req.params.depId)
  const dependencies = await db.getJobDependencies(req.params.id)
  res.json({ success: true, data: { dependencies } })
}))

router.get('/jobs/:id/dependencies', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  const dependencies = await db.getJobDependencies(req.params.id)
  res.json({ success: true, data: { dependencies } })
}))

router.get('/jobs/:id/dependents', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  const dependents = await db.getJobDependents(req.params.id)
  res.json({ success: true, data: { dependents } })
}))

export default router
