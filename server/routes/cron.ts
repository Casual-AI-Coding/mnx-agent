import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service-async.js'
import { getCronScheduler } from '../services/cron-scheduler'
import { WorkflowEngine } from '../services/workflow-engine'
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
import { TaskStatus, TriggerType, ExecutionStatus, CronJob, TaskQueueItem, ExecutionLog, WorkflowTemplate } from '../database/types'
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
    const scheduler = getCronScheduler(db, new WorkflowEngine(db, {
      executeTask: async () => ({ success: true, durationMs: 0 })
    }, {
      hasCapacity: async () => true,
      decrementCapacity: async () => {}
    }))

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
  const jobsWithTags = await db.getCronJobsWithTags(ownerId)
  const jobs = jobsWithTags.map(job => ({
    ...job,
    last_run: job.last_run_at,
    next_run: job.next_run_at,
  }))
  res.json({ success: true, data: { jobs, total: jobs.length } })
}))

router.post('/jobs', validate(createCronJobSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const jobData = req.body
  try {
    JSON.parse(jobData.workflow_json)
  } catch {
    res.status(400).json({ success: false, error: 'workflow_json must be valid JSON' })
    return
  }
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  const job = await db.createCronJob({
    name: jobData.name,
    description: jobData.description,
    cron_expression: jobData.cron_expression,
    is_active: jobData.is_active,
    workflow_json: jobData.workflow_json,
    timeout_ms: jobData.timeout_ms,
  }, ownerId)
  
  // Add tags if provided
  if (jobData.tags && Array.isArray(jobData.tags)) {
    for (const tag of jobData.tags) {
      await db.addJobTag(job.id, tag)
    }
  }
  
  res.json({ success: true, data: { ...job, tags: jobData.tags || [] } })
}))

router.get('/jobs/:id', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  const tags = await db.getJobTags(job.id)
  const dependencies = await db.getJobDependencies(job.id)
  res.json({ success: true, data: { ...job, tags, dependencies } })
}))

router.put('/jobs/:id', validateParams(cronJobIdParamsSchema), validate(updateCronJobSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const existingJob = await db.getCronJobById(req.params.id, ownerId)
  if (!existingJob) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  if (req.body.workflow_json) {
    try {
      JSON.parse(req.body.workflow_json)
    } catch {
      res.status(400).json({ success: false, error: 'workflow_json must be valid JSON' })
      return
    }
  }
  const job = await db.updateCronJob(req.params.id, req.body, ownerId)
  
  // Update tags if provided
  if (req.body.tags && Array.isArray(req.body.tags)) {
    // Remove existing tags
    const existingTags = await db.getJobTags(req.params.id)
    for (const tag of existingTags) {
      await db.removeJobTag(req.params.id, tag)
    }
    // Add new tags
    for (const tag of req.body.tags) {
      await db.addJobTag(req.params.id, tag)
    }
  }
  
  res.json({ success: true, data: { ...job, tags: req.body.tags || await db.getJobTags(req.params.id) } })
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
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  const log = await db.createExecutionLog({
    job_id: job.id,
    trigger_type: TriggerType.MANUAL,
    status: ExecutionStatus.RUNNING,
    tasks_executed: 0,
    tasks_succeeded: 0,
    tasks_failed: 0,
  }, ownerId)
  res.json({ success: true, data: { message: 'Job triggered', logId: log.id } })
}))

router.post('/jobs/:id/toggle', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const job = await db.getCronJobById(req.params.id, ownerId)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  const updatedJob = await db.toggleCronJobActive(req.params.id, ownerId)
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
    workflow_json: job.workflow_json,
    timeout_ms: job.timeout_ms ?? undefined,
  }, ownerId)
  
  // Clone tags
  const tags = await db.getJobTags(req.params.id)
  for (const tag of tags) {
    await db.addJobTag(clonedJob.id, tag)
  }
  
  res.json({ success: true, data: { ...clonedJob, tags } })
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
  
  // Validate workflow JSON
  let validation = { valid: true, errors: [] as string[] }
  try {
    const workflow = JSON.parse(job.workflow_json)
    if (!workflow.nodes || workflow.nodes.length === 0) {
      validation.valid = false
      validation.errors.push('Workflow has no nodes')
    }
  } catch {
    validation.valid = false
    validation.errors.push('Invalid workflow JSON')
  }
  
  // Calculate next 5 execution times
  const scheduler = getCronScheduler(db, new WorkflowEngine(db, {
    executeTask: async () => ({ success: true, durationMs: 0 })
  }, {
    hasCapacity: async () => true,
    decrementCapacity: async () => {}
  }))
  
  const nextRuns: string[] = []
  try {
    const interval = CronExpressionParser.parse(job.cron_expression, { tz: scheduler.getTimezone() })
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
// Tags API
// ============================================
router.get('/tags', asyncHandler(async (_req, res) => {
  const db = await getDatabase()
  const tags = await db.getAllTags()
  res.json({ success: true, data: { tags, total: tags.length } })
}))

router.get('/jobs/by-tag/:tag', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const jobs = await db.getJobsByTag(req.params.tag, ownerId)
  res.json({ success: true, data: { jobs, total: jobs.length } })
}))

// ============================================
// Task Queue API
// ============================================

router.get('/queue', validateQuery(taskQueueQuerySchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const query = req.query as unknown as { status?: TaskStatus; job_id?: string; page: number; limit: number }
  const { status, job_id, page, limit } = query
  let tasks: TaskQueueItem[] = await db.getAllTasks(status, ownerId)
  if (job_id) {
    tasks = tasks.filter((t: TaskQueueItem) => t.job_id === job_id)
  }
  const offset = (page - 1) * limit
  const paginatedTasks = tasks.slice(offset, offset + limit)
  res.json({ success: true, data: { tasks: paginatedTasks, total: tasks.length, page, limit } })
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
// Dead Letter Queue API
// ============================================
router.get('/dead-letter', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const limit = parseInt(req.query.limit as string) || 100
  const items = await db.getDeadLetterQueue(limit, ownerId)
  res.json({ success: true, data: { items, total: items.length } })
}))

router.post('/dead-letter/:id/retry', validateParams(taskIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const item = await db.getDeadLetterItemById(req.params.id, ownerId)
  if (!item) {
    res.status(404).json({ success: false, error: 'Item not found' })
    return
  }
  
  // Create a new task from the dead letter item
  const task = await db.createTask({
    job_id: item.job_id,
    task_type: item.task_type,
    payload: item.payload,
  }, ownerId)
  
  // Mark dead letter item as resolved
  await db.updateDeadLetterItem(item.id, {
    resolved_at: new Date().toISOString(),
    resolution: 'retried',
  }, ownerId)
  
  res.json({ success: true, data: { task } })
}))

router.delete('/dead-letter/:id', validateParams(taskIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const item = await db.getDeadLetterItemById(req.params.id, ownerId)
  if (!item) {
    res.status(404).json({ success: false, error: 'Item not found' })
    return
  }
  
  await db.updateDeadLetterItem(item.id, {
    resolved_at: new Date().toISOString(),
    resolution: 'discarded',
  }, ownerId)
  
  res.json({ success: true, data: { deleted: true } })
}))

// ============================================
// Webhooks API
// ============================================
router.get('/webhooks', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const jobId = req.query.job_id as string | undefined
  const configs = await db.getWebhookConfigs(jobId, ownerId)
  res.json({ success: true, data: { webhooks: configs, total: configs.length } })
}))

router.post('/webhooks', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  const config = await db.createWebhookConfig(req.body, ownerId)
  res.json({ success: true, data: config })
}))

router.get('/webhooks/:id', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const config = await db.getWebhookConfigById(req.params.id, ownerId)
  if (!config) {
    res.status(404).json({ success: false, error: 'Webhook not found' })
    return
  }
  res.json({ success: true, data: config })
}))

router.put('/webhooks/:id', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const existing = await db.getWebhookConfigById(req.params.id, ownerId)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Webhook not found' })
    return
  }
  const config = await db.updateWebhookConfig(req.params.id, req.body, ownerId)
  res.json({ success: true, data: config })
}))

router.delete('/webhooks/:id', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const existing = await db.getWebhookConfigById(req.params.id, ownerId)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Webhook not found' })
    return
  }
  await db.deleteWebhookConfig(req.params.id, ownerId)
  res.json({ success: true, data: { deleted: true } })
}))

router.post('/webhooks/:id/test', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const notificationService = getNotificationService(db)
  const result = await notificationService.testWebhook(req.params.id)
  if (result.success) {
    res.json({ success: true, data: { delivered: true } })
  } else {
    res.status(400).json({ success: false, error: result.error })
  }
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
    is_template: req.body.is_template,
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
