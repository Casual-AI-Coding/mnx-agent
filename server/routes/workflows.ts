import { Router } from 'express'
import { validate, validateParams } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { successResponse, errorResponse, deletedResponse, createdResponse } from '../middleware/api-response'
import { getDatabaseService, getEventBus } from '../service-registration.js'
import { getServiceNodeRegistryService } from '../service-registration.js'
import { WorkflowService } from '../services/domain'
import {
  workflowIdParamsSchema,
  createWorkflowSchema,
  updateWorkflowSchema,
  partialWorkflowSchema,
  testRunWorkflowSchema,
} from '../validation/workflow-schemas'
import { buildOwnerFilter, getOwnerIdForInsert } from '../middleware/data-isolation.js'
import { WorkflowEngine } from '../services/workflow/index'
import {
  getPaginationParams,
  createPaginatedResponse,
  parseJsonField,
  validateWorkflowNodePermissions,
} from '../utils/index.js'

const router = Router()

router.get('/available-actions', asyncHandler(async (req, res) => {
  const userRole = req.user!.role

  const db = getDatabaseService()
  const serviceRegistry = getServiceNodeRegistryService()
  const nodes = await serviceRegistry.getAvailableNodes(userRole)

  const grouped = nodes.reduce<Record<string, unknown[]>>((acc: Record<string, unknown[]>, node) => {
    const category = node.category
    if (!acc[category]) acc[category] = []
    acc[category].push({
      id: node.id,
      service: node.service_name,
      method: node.method_name,
      label: node.display_name,
      minRole: node.min_role,
    })
    return acc
  }, {})

  successResponse(res, grouped)
}))

router.get('/', asyncHandler(async (req, res) => {
  const { is_public } = req.query
  const { page, limit, offset } = getPaginationParams(req.query)
  const ownerId = buildOwnerFilter(req).params[0]

  const db = getDatabaseService()
  const workflowService = new WorkflowService(db)
  
  let isPublicFilter: boolean | undefined
  if (is_public === 'true') {
    isPublicFilter = true
  } else if (is_public === 'false') {
    isPublicFilter = false
  }

  const result = await workflowService.getPaginated(page, limit, ownerId)

  successResponse(res, createPaginatedResponse(result.templates, result.total, page, limit, 'workflows'))
}))

router.get('/:id', validateParams(workflowIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const workflowService = new WorkflowService(db)
  const userId = req.user!.userId
  const userRole = req.user!.role

  const workflow = await workflowService.getById(req.params.id)
  if (!workflow) {
    errorResponse(res, 'Workflow not found', 404)
    return
  }

  const hasAccess =
    workflow.owner_id === userId ||
    userRole === 'super' ||
    workflow.is_public ||
    await db.hasWorkflowPermission(req.params.id, userId)

  if (!hasAccess) {
    errorResponse(res, 'You do not have access to this workflow', 403)
    return
  }

  successResponse(res, workflow)
}))

router.post('/', validate(createWorkflowSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const workflowService = new WorkflowService(db)
  const userRole = req.user!.role
  const ownerId = getOwnerIdForInsert(req) ?? undefined

  const { nodes_json } = req.body
  const parsed = parseJsonField<{ nodes: Array<{ type: string; data?: { config?: { service?: string; method?: string } } }> }>(nodes_json, res, 'nodes_json')
  if (!parsed) return

  if (!(await validateWorkflowNodePermissions(parsed, userRole, db, res))) return

  const workflow = await workflowService.create({
    name: req.body.name,
    description: req.body.description,
    nodes_json: req.body.nodes_json,
    edges_json: req.body.edges_json,
    is_public: req.body.is_public ?? req.body.is_template,
  }, ownerId)
  createdResponse(res, workflow)
}))

router.put('/:id', validateParams(workflowIdParamsSchema), validate(updateWorkflowSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const workflowService = new WorkflowService(db)
  const userId = req.user!.userId
  const userRole = req.user!.role

  const existing = await workflowService.getById(req.params.id)
  if (!existing) {
    errorResponse(res, 'Workflow not found', 404)
    return
  }

  const hasAccess = existing.owner_id === userId || userRole === 'super'
  if (!hasAccess) {
    errorResponse(res, 'You do not have permission to update this workflow', 403)
    return
  }

  if (req.body.nodes_json) {
    const parsed = parseJsonField<{ nodes: Array<{ type: string; data?: { config?: { service?: string; method?: string } } }> }>(req.body.nodes_json, res, 'nodes_json')
    if (!parsed) return
    if (!(await validateWorkflowNodePermissions(parsed, userRole, db, res))) return
  }

  const workflow = await workflowService.update(req.params.id, req.body)
  successResponse(res, workflow)
}))

router.patch('/:id', validateParams(workflowIdParamsSchema), validate(partialWorkflowSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const workflowService = new WorkflowService(db)
  const userId = req.user!.userId
  const userRole = req.user!.role

  const existing = await workflowService.getById(req.params.id)
  if (!existing) {
    errorResponse(res, 'Workflow not found', 404)
    return
  }

  const hasAccess = existing.owner_id === userId || userRole === 'super'
  if (!hasAccess) {
    errorResponse(res, 'You do not have permission to update this workflow', 403)
    return
  }

  if (req.body.nodes_json) {
    const parsed = parseJsonField<{ nodes: Array<{ type: string; data?: { config?: { service?: string; method?: string } } }> }>(req.body.nodes_json, res, 'nodes_json')
    if (!parsed) return
    if (!(await validateWorkflowNodePermissions(parsed, userRole, db, res))) return
  }

  const workflow = await workflowService.update(req.params.id, req.body)
  successResponse(res, workflow)
}))

router.delete('/:id', validateParams(workflowIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const workflowService = new WorkflowService(db)
  const ownerId = buildOwnerFilter(req).params[0]

  try {
    await workflowService.delete(req.params.id, ownerId)
  } catch {
    errorResponse(res, 'Workflow not found', 404)
    return
  }
  deletedResponse(res)
}))

router.post('/:id/test-run', asyncHandler(async (req, res) => {
  const { id } = req.params
  const { testData = {}, dryRun = false } = req.body
  const ownerId = buildOwnerFilter(req).params[0]

  const db = getDatabaseService()
  const workflowService = new WorkflowService(db)

  const workflow = await workflowService.getById(id, ownerId)
  if (!workflow) {
    return errorResponse(res, 'Workflow not found', 404)
  }

  const nodes = JSON.parse(workflow.nodes_json)
  const edges = JSON.parse(workflow.edges_json)
  const executionId = `test_${Date.now()}`

  const serviceRegistry = getServiceNodeRegistryService()
  const eventBus = getEventBus()
  const workflowEngine = new WorkflowEngine(db, serviceRegistry, undefined, eventBus)

  eventBus.emitWorkflowTestStarted(id, executionId)

  try {
    const workflowJson = JSON.stringify({ nodes, edges })
    const result = await workflowEngine.executeWorkflow(workflowJson, executionId, undefined, { testData, dryRun })

    const nodeResults: Array<{ id: string; status: string; output: unknown; duration: number }> = []
    result.nodeResults.forEach((nodeResult, nodeId) => {
      nodeResults.push({
        id: nodeId,
        status: nodeResult.success ? 'completed' : 'failed',
        output: nodeResult.data,
        duration: nodeResult.durationMs,
      })
    })

    eventBus.emitWorkflowTestCompleted(id, executionId, { nodeResults, success: result.success })

    successResponse(res, {
      executionId,
      nodes: nodeResults,
      duration: result.totalDurationMs,
      status: result.success ? 'completed' : 'failed',
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Test run failed'
    eventBus.emitWorkflowTestCompleted(id, executionId, null, errorMessage)
    errorResponse(res, errorMessage, 500)
  }
}))

export default router