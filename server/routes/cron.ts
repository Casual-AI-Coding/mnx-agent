import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service-async.js'
import { getCronScheduler } from '../services/cron-scheduler'
import { WorkflowEngine } from '../services/workflow-engine'
import { getServiceNodeRegistry } from '../services/service-node-registry'
import { getNotificationService } from '../services/notification-service'
import { CronExpressionParser } from 'cron-parser'
import {
  createCronJobSchema,
  updateCronJobSchema,
  cronJobIdParamsSchema,
  createTaskSchema,
  updateTaskSchema,
  taskIdParamsSchema,
  taskQueueQuerySchema,
  executionLogQuerySchema,
  executionLogIdParamsSchema,
  workflowValidateSchema,
  workflowTemplateIdParamsSchema,
  createWorkflowTemplateSchema,
  updateWorkflowTemplateSchema,
} from '../validation/cron-schemas'
import { TaskStatus, TriggerType, ExecutionStatus, TaskQueueItem, ExecutionLog, WorkflowTemplate } from '../database/types'
import { buildOwnerFilter, getOwnerIdForInsert } from '../middleware/data-isolation.js'

const router = Router()

function parsePayload(payload: string | Record<string, unknown>): string {
  if (typeof payload === 'string') return payload
  return JSON.stringify(payload)
}

// ============================================
// Health Check Endpoint
// ============================================
router.get('/health', asyncHandler(async (_req, res) => {
  try {
    const db = await getDatabase()
    const serviceRegistry = getServiceNodeRegistry(db)
    const scheduler = getCronScheduler(db, new WorkflowEngine(db, serviceRegistry))

    // Get task counts
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
    res.json({ success: true, data: health })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Health check failed',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      }
    })
  }
}))

// ============================================
// Cron Jobs API
// ============================================

router.get('/jobs', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const jobs = await db.getAllCronJobs(ownerId)
  res.json({ success: true, data: { jobs, total: jobs.length } })
}))

router.post('/jobs', validate(createCronJobSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const serviceRegistry = getServiceNodeRegistry(db)
  const scheduler = getCronScheduler(db, new WorkflowEngine(db, serviceRegistry))
  const jobData = req.body
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  const job = await db.createCronJob({
    name: jobData.name,
    description: jobData.description,
    cron_expression: jobData.cron_expression,
    is_active: jobData.is_active,
    workflow_id: jobData.workflow_id || '',
    timezone: jobData.timezone || 'UTC',
    timeout_ms: jobData.timeout_ms,
  }, ownerId)

  if (job.is_active) {
    await scheduler.scheduleJob(job)
  }

  res.json({ success: true, data: job })
}))

router.get('/jobs/:id', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  res.json({ success: true, data: job })
}))

router.put('/jobs/:id', validateParams(cronJobIdParamsSchema), validate(updateCronJobSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const existingJob = await db.getCronJobById(req.params.id, ownerId)
  if (!existingJob) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  const job = await db.updateCronJob(req.params.id, req.body, ownerId)
  
  res.json({ success: true, data: job })
}))

router.delete('/jobs/:id', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  const tasks: TaskQueueItem[] = await db.getTasksByJobId(req.params.id, ownerId)
  for (const task of tasks) {
    await db.deleteTask(task.id, ownerId)
  }
  await db.deleteCronJob(req.params.id, ownerId)
  res.json({ success: true, data: { deleted: true, tasksDeleted: tasks.length } })
}))

router.post('/jobs/:id/run', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const serviceRegistry = getServiceNodeRegistry(db)
  const scheduler = getCronScheduler(db, new WorkflowEngine(db, serviceRegistry))
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }

  scheduler.executeJobTick(job)

  res.json({ success: true, data: { message: 'Job triggered' } })
}))

router.post('/jobs/:id/toggle', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const serviceRegistry = getServiceNodeRegistry(db)
  const scheduler = getCronScheduler(db, new WorkflowEngine(db, serviceRegistry))
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
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

  res.json({ success: true, data: { job: updatedJob, scheduled: updatedJob?.is_active } })
}))

// ============================================
// Job Cloning
// ============================================
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
    is_active: false, // Clone as inactive
    workflow_id: job.workflow_id,
    timezone: job.timezone,
    timeout_ms: job.timeout_ms ?? undefined,
  }, ownerId)
  
  res.json({ success: true, data: clonedJob })
}))

// ============================================
// Job Dry Run
// ============================================
router.post('/jobs/:id/dry-run', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  
  // Calculate next 5 execution times
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
  
  // Get historical stats for estimated duration
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

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

// ============================================
// Bulk Operations
// ============================================
router.post('/jobs/bulk/enable', asyncHandler(async (req, res) => {
  const db = await getDatabase()
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
      await db.toggleCronJobActive(id, ownerId)
      updated++
    }
  }
  res.json({ success: true, data: { updated } })
}))

router.post('/jobs/bulk/disable', asyncHandler(async (req, res) => {
  const db = await getDatabase()
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
      await db.toggleCronJobActive(id, ownerId)
      updated++
    }
  }
  res.json({ success: true, data: { updated } })
}))

router.post('/jobs/bulk/delete', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const { ids } = req.body
  if (!Array.isArray(ids)) {
    res.status(400).json({ success: false, error: 'ids must be an array' })
    return
  }
  let deleted = 0
  for (const id of ids) {
    if (await db.deleteCronJob(id, ownerId)) {
      deleted++
    }
  }
  res.json({ success: true, data: { deleted } })
}))

// ============================================
// Task Queue API
// ============================================

router.get('/queue', validateQuery(taskQueueQuerySchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const query = req.query as unknown as { status?: TaskStatus; job_id?: string; page: number; limit: number }
  const { status, job_id, page, limit } = query
  const offset = (page - 1) * limit
  const result = await db.getAllTasks({ status, ownerId, jobId: job_id, limit, offset })
  res.json({ success: true, data: { tasks: result.tasks, total: result.total, page, limit } })
}))

router.post('/queue', validate(createTaskSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  const taskData = req.body
  const task = await db.createTask({
    job_id: taskData.job_id,
    task_type: taskData.task_type,
    payload: parsePayload(taskData.payload),
    priority: taskData.priority,
    max_retries: taskData.max_retries,
    status: TaskStatus.PENDING,
  }, ownerId)
  res.json({ success: true, data: task })
}))

router.put('/queue/:id', validateParams(taskIdParamsSchema), validate(updateTaskSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const task = await db.getTaskById(req.params.id, ownerId)
  if (!task) {
    res.status(404).json({ success: false, error: 'Task not found' })
    return
  }
  const updates: { status?: TaskStatus; error_message?: string | null; result?: string | null } = {}
  if (req.body.status) updates.status = req.body.status as TaskStatus
  if (req.body.error_message) updates.error_message = req.body.error_message
  if (req.body.result) updates.result = req.body.result
  const updatedTask = await db.updateTask(req.params.id, updates, ownerId)
  res.json({ success: true, data: updatedTask })
}))

router.delete('/queue/:id', validateParams(taskIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const task = await db.getTaskById(req.params.id, ownerId)
  if (!task) {
    res.status(404).json({ success: false, error: 'Task not found' })
    return
  }
  await db.deleteTask(req.params.id, ownerId)
  res.json({ success: true, data: { deleted: true } })
}))

router.post('/queue/:id/retry', validateParams(taskIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const task = await db.getTaskById(req.params.id, ownerId)
  if (!task) {
    res.status(404).json({ success: false, error: 'Task not found' })
    return
  }
  if (task.status !== TaskStatus.FAILED) {
    res.status(400).json({ success: false, error: 'Only failed tasks can be retried' })
    return
  }
  const updatedTask = await db.updateTask(req.params.id, {
    status: TaskStatus.PENDING,
    retry_count: 0,
    error_message: null,
  }, ownerId)
  res.json({ success: true, data: updatedTask })
}))

// ============================================
// Execution Logs API
// ============================================

router.get('/logs', validateQuery(executionLogQuerySchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const query = req.query as unknown as { job_id?: string; status?: string; limit: number }
  const { job_id, status, limit } = query
  let logs: ExecutionLog[] = await db.getAllExecutionLogs(job_id, limit, ownerId)
  if (status) logs = logs.filter((l: ExecutionLog) => l.status === status)
  res.json({ success: true, data: { logs, total: logs.length } })
}))

router.get('/logs/:id', validateParams(executionLogIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const log = await db.getExecutionLogById(req.params.id, ownerId)
  if (!log) {
    res.status(404).json({ success: false, error: 'Log not found' })
    return
  }
  let tasks: { id: string; status: string; created_at: string }[] = []
  if (log.job_id) {
    tasks = (await db.getTasksByJobId(log.job_id, ownerId)).map((t: TaskQueueItem) => ({
      id: t.id,
      status: t.status,
      created_at: t.created_at,
    }))
  }
  res.json({ success: true, data: { log, tasks } })
}))

// ============================================
// Workflow API
// ============================================

router.post('/workflow/validate', validate(workflowValidateSchema), asyncHandler(async (req, res) => {
  const { workflow_json, nodes, edges } = req.body
  let parsedNodes: { id: string }[] = []
  let parsedEdges: { source: string; target: string }[] = []
  const errors: string[] = []
  if (workflow_json) {
    try {
      const parsed = JSON.parse(workflow_json)
      parsedNodes = parsed.nodes || []
      parsedEdges = parsed.edges || []
    } catch {
      errors.push('workflow_json is not valid JSON')
    }
  } else {
    parsedNodes = nodes || []
    parsedEdges = edges || []
  }
  if (parsedNodes.length === 0) errors.push('Workflow must have at least one node')
  const nodeIds = new Set<string>()
  for (const node of parsedNodes) {
    if (!node.id) errors.push('Node missing id field')
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`)
    }
    nodeIds.add(node.id)
  }
  for (const edge of parsedEdges) {
    if (!edge.source || !edge.target) errors.push('Edge missing source or target field')
    if (edge.source && !parsedNodes.find(n => n.id === edge.source)) errors.push(`Edge source ${edge.source} does not exist in nodes`)
    if (edge.target && !parsedNodes.find(n => n.id === edge.target)) errors.push(`Edge target ${edge.target} does not exist in nodes`)
  }
  const valid = errors.length === 0
  res.json({ success: true, data: { valid, errors, nodes: parsedNodes.length, edges: parsedEdges.length } })
}))

router.get('/workflow/templates', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const templates: WorkflowTemplate[] = await db.getMarkedWorkflowTemplates(ownerId)
  res.json({ success: true, data: { templates, total: templates.length } })
}))

router.post('/workflow/templates', validate(createWorkflowTemplateSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  try {
    JSON.parse(req.body.nodes_json)
    JSON.parse(req.body.edges_json)
  } catch {
    res.status(400).json({ success: false, error: 'nodes_json and edges_json must be valid JSON' })
    return
  }
  const template = await db.createWorkflowTemplate({
    name: req.body.name,
    description: req.body.description,
    nodes_json: req.body.nodes_json,
    edges_json: req.body.edges_json,
    is_public: req.body.is_template,
  }, ownerId)
  res.json({ success: true, data: template })
}))

router.put('/workflow/templates/:id', validateParams(workflowTemplateIdParamsSchema), validate(updateWorkflowTemplateSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const template = await db.getWorkflowTemplateById(req.params.id, ownerId)
  if (!template) {
    res.status(404).json({ success: false, error: 'Template not found' })
    return
  }
  if (req.body.nodes_json) {
    try { JSON.parse(req.body.nodes_json) } catch {
      res.status(400).json({ success: false, error: 'nodes_json must be valid JSON' })
      return
    }
  }
  if (req.body.edges_json) {
    try { JSON.parse(req.body.edges_json) } catch {
      res.status(400).json({ success: false, error: 'edges_json must be valid JSON' })
      return
    }
  }
  const updatedTemplate = await db.updateWorkflowTemplate(req.params.id, req.body, ownerId)
  res.json({ success: true, data: updatedTemplate })
}))

router.delete('/workflow/templates/:id', validateParams(workflowTemplateIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const template = await db.getWorkflowTemplateById(req.params.id, ownerId)
  if (!template) {
    res.status(404).json({ success: false, error: 'Template not found' })
    return
  }
  await db.deleteWorkflowTemplate(req.params.id, ownerId)
  res.json({ success: true, data: { deleted: true } })
}))

export default router
