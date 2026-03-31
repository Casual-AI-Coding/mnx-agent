import { Router, Request, Response } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { DatabaseService, getDatabase } from '../database/service'
import { getMiniMaxClient } from '../lib/minimax'
import { getCronScheduler } from '../services/cron-scheduler'
import { WorkflowEngine } from '../services/workflow-engine'
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

const router = Router()
const db: DatabaseService = getDatabase()

function parsePayload(payload: string | Record<string, unknown>): string {
  if (typeof payload === 'string') return payload
  return JSON.stringify(payload)
}

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((error: Error & { code?: number }) => {
      const statusCode = error.code && error.code >= 100 && error.code < 600 ? error.code : 500
      res.status(statusCode).json({ success: false, error: error.message })
    })
  }
}

// ============================================
// Health Check Endpoint
// ============================================
router.get('/health', asyncHandler(async (_req, res) => {
  try {
    const scheduler = getCronScheduler(db, new WorkflowEngine(db, {
      executeTask: async () => ({ success: true, durationMs: 0 })
    }, {
      hasCapacity: async () => true,
      decrementCapacity: async () => {}
    }))

    // Get task counts
    const allTasks = db.getAllTasks()
    const pendingCount = allTasks.filter(t => t.status === TaskStatus.PENDING).length
    const runningCount = allTasks.filter(t => t.status === TaskStatus.RUNNING).length
    const failedCount = allTasks.filter(t => t.status === TaskStatus.FAILED).length

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      scheduler: {
        jobsScheduled: scheduler.getJobCount(),
        jobsRunning: scheduler.getRunningJobCount(),
        timezone: scheduler.getTimezone(),
      },
      database: {
        connected: true,
      },
      queue: {
        pending: pendingCount,
        running: runningCount,
        failed: failedCount,
        total: allTasks.length,
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

router.get('/jobs', asyncHandler(async (_req, res) => {
  const jobs: CronJob[] = db.getAllCronJobs()
  const jobsWithStats = jobs.map((job: CronJob) => ({
    ...job,
    last_run: job.last_run_at,
    next_run: job.next_run_at,
    total_runs: job.total_runs,
  }))
  res.json({ success: true, data: { jobs: jobsWithStats, total: jobs.length } })
}))

router.post('/jobs', validate(createCronJobSchema), asyncHandler(async (req, res) => {
  const jobData = req.body
  try {
    JSON.parse(jobData.workflow_json)
  } catch {
    res.status(400).json({ success: false, error: 'workflow_json must be valid JSON' })
    return
  }
  const job = db.createCronJob({
    name: jobData.name,
    description: jobData.description,
    cron_expression: jobData.cron_expression,
    is_active: jobData.is_active,
    workflow_json: jobData.workflow_json,
  })
  res.json({ success: true, data: job })
}))

router.get('/jobs/:id', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const job = db.getCronJobById(req.params.id)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  res.json({ success: true, data: job })
}))

router.put('/jobs/:id', validateParams(cronJobIdParamsSchema), validate(updateCronJobSchema), asyncHandler(async (req, res) => {
  const existingJob = db.getCronJobById(req.params.id)
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
  const job = db.updateCronJob(req.params.id, req.body)
  res.json({ success: true, data: job })
}))

router.delete('/jobs/:id', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const job = db.getCronJobById(req.params.id)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  const tasks: TaskQueueItem[] = db.getTasksByJobId(req.params.id)
  for (const task of tasks) {
    db.deleteTask(task.id)
  }
  db.deleteCronJob(req.params.id)
  res.json({ success: true, data: { deleted: true, tasksDeleted: tasks.length } })
}))

router.post('/jobs/:id/run', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const job = db.getCronJobById(req.params.id)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  const log = db.createExecutionLog({
    job_id: job.id,
    trigger_type: TriggerType.MANUAL,
    status: ExecutionStatus.RUNNING,
    tasks_executed: 0,
    tasks_succeeded: 0,
    tasks_failed: 0,
  })
  res.json({ success: true, data: { message: 'Job triggered', logId: log.id } })
}))

router.post('/jobs/:id/toggle', validateParams(cronJobIdParamsSchema), asyncHandler(async (req, res) => {
  const job = db.getCronJobById(req.params.id)
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' })
    return
  }
  const updatedJob = db.toggleCronJobActive(req.params.id)
  res.json({ success: true, data: { job: updatedJob, scheduled: updatedJob?.is_active } })
}))

// ============================================
// Task Queue API
// ============================================

router.get('/queue', validateQuery(taskQueueQuerySchema), asyncHandler(async (req, res) => {
  const query = req.query as unknown as { status?: TaskStatus; job_id?: string; page: number; limit: number }
  const { status, job_id, page, limit } = query
  let tasks: TaskQueueItem[] = db.getAllTasks(status)
  if (job_id) {
    tasks = tasks.filter((t: TaskQueueItem) => t.job_id === job_id)
  }
  const offset = (page - 1) * limit
  const paginatedTasks = tasks.slice(offset, offset + limit)
  res.json({ success: true, data: { tasks: paginatedTasks, total: tasks.length, page, limit } })
}))

router.post('/queue', validate(createTaskSchema), asyncHandler(async (req, res) => {
  const taskData = req.body
  const task = db.createTask({
    job_id: taskData.job_id,
    task_type: taskData.task_type,
    payload: parsePayload(taskData.payload),
    priority: taskData.priority,
    max_retries: taskData.max_retries,
    status: TaskStatus.PENDING,
  })
  res.json({ success: true, data: task })
}))

router.put('/queue/:id', validateParams(taskIdParamsSchema), validate(updateTaskSchema), asyncHandler(async (req, res) => {
  const task = db.getTaskById(req.params.id)
  if (!task) {
    res.status(404).json({ success: false, error: 'Task not found' })
    return
  }
  const updates: { status?: TaskStatus; error_message?: string | null; result?: string | null } = {}
  if (req.body.status) updates.status = req.body.status as TaskStatus
  if (req.body.error_message) updates.error_message = req.body.error_message
  if (req.body.result) updates.result = req.body.result
  const updatedTask = db.updateTask(req.params.id, updates)
  res.json({ success: true, data: updatedTask })
}))

router.delete('/queue/:id', validateParams(taskIdParamsSchema), asyncHandler(async (req, res) => {
  const task = db.getTaskById(req.params.id)
  if (!task) {
    res.status(404).json({ success: false, error: 'Task not found' })
    return
  }
  db.deleteTask(req.params.id)
  res.json({ success: true, data: { deleted: true } })
}))

router.post('/queue/:id/retry', validateParams(taskIdParamsSchema), asyncHandler(async (req, res) => {
  const task = db.getTaskById(req.params.id)
  if (!task) {
    res.status(404).json({ success: false, error: 'Task not found' })
    return
  }
  if (task.status !== TaskStatus.FAILED) {
    res.status(400).json({ success: false, error: 'Only failed tasks can be retried' })
    return
  }
  const updatedTask = db.updateTask(req.params.id, {
    status: TaskStatus.PENDING,
    retry_count: 0,
    error_message: null,
  })
  res.json({ success: true, data: updatedTask })
}))

// ============================================
// Execution Logs API
// ============================================

router.get('/logs', validateQuery(executionLogQuerySchema), asyncHandler(async (req, res) => {
  const query = req.query as unknown as { job_id?: string; status?: string; limit: number }
  const { job_id, status, limit } = query
  let logs: ExecutionLog[] = db.getAllExecutionLogs(job_id, limit)
  if (status) logs = logs.filter((l: ExecutionLog) => l.status === status)
  res.json({ success: true, data: { logs, total: logs.length } })
}))

router.get('/logs/:id', validateParams(executionLogIdParamsSchema), asyncHandler(async (req, res) => {
  const log = db.getExecutionLogById(req.params.id)
  if (!log) {
    res.status(404).json({ success: false, error: 'Log not found' })
    return
  }
  let tasks: { id: string; status: string; created_at: string }[] = []
  if (log.job_id) {
    tasks = db.getTasksByJobId(log.job_id).map((t: TaskQueueItem) => ({
      id: t.id,
      status: t.status,
      created_at: t.created_at,
    }))
  }
  res.json({ success: true, data: { log, tasks } })
}))

// ============================================
// Capacity API
// ============================================

router.get('/capacity', asyncHandler(async (_req, res) => {
  try {
    const client = getMiniMaxClient()
    const balance = await client.getBalance()
    const records = db.getAllCapacityRecords()
    res.json({ success: true, data: { balance, records } })
  } catch (error) {
    // Return empty capacity data if API key not configured
    const records = db.getAllCapacityRecords()
    res.json({ 
      success: true, 
      data: { 
        balance: { error: 'API key not configured', message: (error as Error).message }, 
        records 
      } 
    })
  }
}))

router.post('/capacity/refresh', asyncHandler(async (_req, res) => {
  try {
    const client = getMiniMaxClient()
    const balance = await client.getBalance()
    const now = new Date()
    const resetAt = new Date(now.getTime() + 60000).toISOString()
    const rateLimits: Record<string, { rpm: number }> = {
      text: { rpm: 500 },
      voice_sync: { rpm: 60 },
      voice_async: { rpm: 60 },
      image: { rpm: 10 },
      music: { rpm: 10 },
      video: { rpm: 5 },
    }
    for (const [serviceType, config] of Object.entries(rateLimits)) {
      db.upsertCapacityRecord(serviceType, {
        remaining_quota: config.rpm,
        total_quota: config.rpm,
        reset_at: resetAt,
      })
    }
    const records = db.getAllCapacityRecords()
    res.json({ success: true, data: { balance, records } })
  } catch (error) {
    res.status(503).json({ success: false, error: (error as Error).message })
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
  const nodeIds = new Set(parsedNodes.map(n => n.id))
  for (const node of parsedNodes) {
    if (!node.id) errors.push('Node missing id field')
    if (nodeIds.has(node.id) && parsedNodes.filter(n => n.id === node.id).length > 1) {
      errors.push(`Duplicate node id: ${node.id}`)
    }
  }
  for (const edge of parsedEdges) {
    if (!edge.source || !edge.target) errors.push('Edge missing source or target field')
    if (edge.source && !parsedNodes.find(n => n.id === edge.source)) errors.push(`Edge source ${edge.source} does not exist in nodes`)
    if (edge.target && !parsedNodes.find(n => n.id === edge.target)) errors.push(`Edge target ${edge.target} does not exist in nodes`)
  }
  const valid = errors.length === 0
  res.json({ success: true, data: { valid, errors, nodes: parsedNodes.length, edges: parsedEdges.length } })
}))

router.get('/workflow/templates', asyncHandler(async (_req, res) => {
  const templates: WorkflowTemplate[] = db.getMarkedWorkflowTemplates()
  res.json({ success: true, data: { templates, total: templates.length } })
}))

router.post('/workflow/templates', validate(createWorkflowTemplateSchema), asyncHandler(async (req, res) => {
  try {
    JSON.parse(req.body.nodes_json)
    JSON.parse(req.body.edges_json)
  } catch {
    res.status(400).json({ success: false, error: 'nodes_json and edges_json must be valid JSON' })
    return
  }
  const template = db.createWorkflowTemplate({
    name: req.body.name,
    description: req.body.description,
    nodes_json: req.body.nodes_json,
    edges_json: req.body.edges_json,
    is_template: req.body.is_template,
  })
  res.json({ success: true, data: template })
}))

router.put('/workflow/templates/:id', validateParams(workflowTemplateIdParamsSchema), validate(updateWorkflowTemplateSchema), asyncHandler(async (req, res) => {
  const template = db.getWorkflowTemplateById(req.params.id)
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
  const updatedTemplate = db.updateWorkflowTemplate(req.params.id, req.body)
  res.json({ success: true, data: updatedTemplate })
}))

router.delete('/workflow/templates/:id', validateParams(workflowTemplateIdParamsSchema), asyncHandler(async (req, res) => {
  const template = db.getWorkflowTemplateById(req.params.id)
  if (!template) {
    res.status(404).json({ success: false, error: 'Template not found' })
    return
  }
  db.deleteWorkflowTemplate(req.params.id)
  res.json({ success: true, data: { deleted: true } })
}))

export default router
