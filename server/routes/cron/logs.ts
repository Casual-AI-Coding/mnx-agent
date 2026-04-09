import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../../middleware/validate'
import { asyncHandler } from '../../middleware/asyncHandler'
import { successResponse, errorResponse } from '../../middleware/api-response'
import { withEntityNotFound } from '../../utils/index.js'
import { getDatabaseService } from '../../service-registration.js'
import { LogService } from '../../services/domain/log.service.js'
import { TaskService } from '../../services/domain/task.service.js'
import { WorkflowEngine } from '../../services/workflow-engine'
import { getExecutionStateManagerInstance } from '../../service-registration.js'
import {
  executionLogQuerySchema,
  executionLogIdParamsSchema,
  workflowValidateSchema,
  workflowTemplateIdParamsSchema,
  createWorkflowTemplateSchema,
  updateWorkflowTemplateSchema,
} from '../../validation/cron-schemas'
import { TaskQueueItem, ExecutionLog, WorkflowTemplate } from '../../database/types'
import { buildOwnerFilter, getOwnerIdForInsert } from '../../middleware/data-isolation.js'

const router = Router()

router.get('/logs', validateQuery(executionLogQuerySchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const logService = new LogService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const query = req.query as unknown as { job_id?: string; status?: string; limit: number }
  const { job_id, status, limit } = query
  let logs: ExecutionLog[] = await logService.getAll({ jobId: job_id, ownerId, limit })
  if (status) logs = logs.filter((l: ExecutionLog) => l.status === status)
  successResponse(res, { logs, total: logs.length })
}))

router.get('/logs/:id', validateParams(executionLogIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const logService = new LogService(db)
  const taskService = new TaskService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const log = await logService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(log, res, 'Log')) return
  let tasks: { id: string; status: string; created_at: string }[] = []
  if (log.job_id) {
    tasks = (await taskService.getByJobId(log.job_id, ownerId)).map((t: TaskQueueItem) => ({
      id: t.id,
      status: t.status,
      created_at: t.created_at,
    }))
  }
  successResponse(res, { log, tasks })
}))

router.get('/logs/:id/details', validateParams(executionLogIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const logService = new LogService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const log = await logService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(log, res, 'Log')) return
  const details = await logService.getDetails(req.params.id)
  successResponse(res, { log, details })
}))

router.post('/executions/:id/pause', asyncHandler(async (req, res) => {
  const engine = WorkflowEngine.getRunningExecutionEngine(req.params.id)
  if (!engine) {
    errorResponse(res, `Execution ${req.params.id} not found or not running`, 404)
    return
  }
  await engine.pauseExecution(req.params.id)
  successResponse(res, { message: `Execution ${req.params.id} paused` })
}))

router.post('/executions/:id/resume', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const stateManager = getExecutionStateManagerInstance()
  const state = await stateManager.getById(req.params.id)
  
  if (!state) {
    errorResponse(res, `Execution ${req.params.id} not found`, 404)
    return
  }
  
  if (state.status !== 'paused') {
    errorResponse(res, `Execution ${req.params.id} is not paused (status: ${state.status})`, 400)
    return
  }
  
  const engine = WorkflowEngine.getRunningExecutionEngine(req.params.id)
  if (!engine) {
    errorResponse(res, `Execution ${req.params.id} engine not found`, 500)
    return
  }
  
  await engine.resumeExecution(req.params.id)
  successResponse(res, { message: `Execution ${req.params.id} resumed` })
}))

router.post('/executions/:id/cancel', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const stateManager = getExecutionStateManagerInstance()
  const state = await stateManager.getById(req.params.id)
  
  if (!state) {
    errorResponse(res, `Execution ${req.params.id} not found`, 404)
    return
  }
  
  if (state.status === 'completed' || state.status === 'failed' || state.status === 'cancelled') {
    errorResponse(res, `Execution ${req.params.id} already ${state.status}`, 400)
    return
  }
  
  await stateManager.update(req.params.id, { status: 'cancelled' })
  successResponse(res, { message: `Execution ${req.params.id} cancelled` })
}))

router.get('/executions/:id', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const stateManager = getExecutionStateManagerInstance()
  const state = await stateManager.getById(req.params.id)
  
  if (!state) {
    errorResponse(res, `Execution ${req.params.id} not found`, 404)
    return
  }
  
  successResponse(res, state)
}))

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
  successResponse(res, { valid, errors, nodes: parsedNodes.length, edges: parsedEdges.length })
}))

router.get('/workflow/templates', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = buildOwnerFilter(req).params[0]
  const templates: WorkflowTemplate[] = await db.getMarkedWorkflowTemplates(ownerId)
  successResponse(res, { templates, total: templates.length })
}))

router.post('/workflow/templates', validate(createWorkflowTemplateSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  try {
    JSON.parse(req.body.nodes_json)
    JSON.parse(req.body.edges_json)
  } catch {
    errorResponse(res, 'nodes_json and edges_json must be valid JSON', 400)
    return
  }
  const template = await db.createWorkflowTemplate({
    name: req.body.name,
    description: req.body.description,
    nodes_json: req.body.nodes_json,
    edges_json: req.body.edges_json,
    is_public: req.body.is_template,
  }, ownerId)
  successResponse(res, template)
}))

router.put('/workflow/templates/:id', validateParams(workflowTemplateIdParamsSchema), validate(updateWorkflowTemplateSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = buildOwnerFilter(req).params[0]
  const template = await db.getWorkflowTemplateById(req.params.id, ownerId)
  if (!withEntityNotFound(template, res, 'Template')) return
  if (req.body.nodes_json) {
    try { JSON.parse(req.body.nodes_json) } catch {
      errorResponse(res, 'nodes_json must be valid JSON', 400)
      return
    }
  }
  if (req.body.edges_json) {
    try { JSON.parse(req.body.edges_json) } catch {
      errorResponse(res, 'edges_json must be valid JSON', 400)
      return
    }
  }
  const updatedTemplate = await db.updateWorkflowTemplate(req.params.id, req.body, ownerId)
  successResponse(res, updatedTemplate)
}))

router.delete('/workflow/templates/:id', validateParams(workflowTemplateIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = buildOwnerFilter(req).params[0]
  const template = await db.getWorkflowTemplateById(req.params.id, ownerId)
  if (!withEntityNotFound(template, res, 'Template')) return
  await db.deleteWorkflowTemplate(req.params.id, ownerId)
  successResponse(res, { deleted: true })
}))

export default router