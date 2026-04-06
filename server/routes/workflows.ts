import { Router } from 'express'
import { validate, validateParams } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { successResponse, errorResponse, deletedResponse, createdResponse } from '../middleware/api-response'
import { getDatabaseService } from '../service-registration.js'
import { getServiceNodeRegistryService } from '../service-registration.js'
import {
  workflowIdParamsSchema,
  createWorkflowSchema,
  updateWorkflowSchema,
  partialWorkflowSchema,
  testRunWorkflowSchema,
} from '../validation/workflow-schemas'
import { buildOwnerFilter, getOwnerIdForInsert } from '../middleware/data-isolation.js'
import { ROLE_HIERARCHY } from '../types/workflow'
import { WorkflowEngine } from '../services/workflow-engine'
import { cronEvents } from '../services/websocket-service'

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
  const { is_public, page, limit } = req.query
  const pageNum = Math.max(1, parseInt(String(page)) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit)) || 20))

  const offset = (pageNum - 1) * limitNum
  const ownerId = buildOwnerFilter(req).params[0]

  const db = getDatabaseService()
  
  let isPublicFilter: boolean | undefined
  if (is_public === 'true') {
    isPublicFilter = true
  } else if (is_public === 'false') {
    isPublicFilter = false
  }

  const result = await db.getWorkflowTemplatesPaginated({
    ownerId,
    isTemplate: isPublicFilter,
    limit: limitNum,
    offset,
  })

  successResponse(res, {
    workflows: result.templates,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      totalPages: Math.ceil(result.total / limitNum),
    },
  })
}))

router.get('/:id', validateParams(workflowIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const userId = req.user!.userId
  const userRole = req.user!.role

  const workflow = await db.getWorkflowTemplateById(req.params.id)
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
  const userRole = req.user!.role
  const ownerId = getOwnerIdForInsert(req) ?? undefined

  const { nodes_json } = req.body
  let actionNodes: Array<{ type: string; data: { config?: { service?: string; method?: string } } }> = []
  try {
    const parsed = JSON.parse(nodes_json)
    actionNodes = (parsed.nodes || []).filter((n: { type: string }) => n.type === 'action')
  } catch {
    errorResponse(res, 'nodes_json must be valid JSON', 400)
    return
  }

  const userLevel = ROLE_HIERARCHY[userRole] ?? 0

  for (const node of actionNodes) {
    const config = node.data?.config || {}
    const { service, method } = config

    if (!service || !method) continue

    const permission = await db.getServiceNodePermission(service, method)

    if (!permission) {
      errorResponse(res, `Unknown service method: ${service}.${method}`, 400)
      return
    }

    if (!permission.is_enabled) {
      errorResponse(res, `Service method ${service}.${method} is disabled`, 403)
      return
    }

    const nodeLevel = ROLE_HIERARCHY[permission.min_role] ?? 0
    if (nodeLevel > userLevel) {
      errorResponse(res, `You don't have permission to use ${service}.${method}. Requires ${permission.min_role} role.`, 403)
      return
    }
  }

  const workflow = await db.createWorkflowTemplate({
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
  const userId = req.user!.userId
  const userRole = req.user!.role

  const existing = await db.getWorkflowTemplateById(req.params.id)
  if (!existing) {
    errorResponse(res, 'Workflow not found', 404)
    return
  }

  const hasAccess =
    existing.owner_id === userId ||
    userRole === 'super'

  if (!hasAccess) {
    errorResponse(res, 'You do not have permission to update this workflow', 403)
    return
  }

  if (req.body.nodes_json) {
    let actionNodes: Array<{ type: string; data: { config?: { service?: string; method?: string } } }> = []
    try {
      const parsed = JSON.parse(req.body.nodes_json)
      actionNodes = (parsed.nodes || []).filter((n: { type: string }) => n.type === 'action')
    } catch {
      errorResponse(res, 'nodes_json must be valid JSON', 400)
      return
    }

    const userLevel = ROLE_HIERARCHY[userRole] ?? 0

    for (const node of actionNodes) {
      const config = node.data?.config || {}
      const { service, method } = config

      if (!service || !method) continue

      const permission = await db.getServiceNodePermission(service, method)

      if (!permission) {
        errorResponse(res, `Unknown service method: ${service}.${method}`, 400)
        return
      }

      if (!permission.is_enabled) {
        errorResponse(res, `Service method ${service}.${method} is disabled`, 403)
        return
      }

      const nodeLevel = ROLE_HIERARCHY[permission.min_role] ?? 0
      if (nodeLevel > userLevel) {
        errorResponse(res, `You don't have permission to use ${service}.${method}. Requires ${permission.min_role} role.`, 403)
        return
      }
    }
  }

  const workflow = await db.updateWorkflowTemplate(req.params.id, req.body)
  successResponse(res, workflow)
}))

router.patch('/:id', validateParams(workflowIdParamsSchema), validate(partialWorkflowSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const userId = req.user!.userId
  const userRole = req.user!.role

  const existing = await db.getWorkflowTemplateById(req.params.id)
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
    let actionNodes: Array<{ type: string; data: { config?: { service?: string; method?: string } } }> = []
    try {
      const parsed = JSON.parse(req.body.nodes_json)
      actionNodes = (parsed.nodes || []).filter((n: { type: string }) => n.type === 'action')
    } catch {
      errorResponse(res, 'nodes_json must be valid JSON', 400)
      return
    }

    const userLevel = ROLE_HIERARCHY[userRole] ?? 0
    for (const node of actionNodes) {
      const config = node.data?.config || {}
      const { service, method } = config
      if (!service || !method) continue

      const permission = await db.getServiceNodePermission(service, method)
      if (!permission) {
        errorResponse(res, `Unknown service method: ${service}.${method}`, 400)
        return
      }
      if (!permission.is_enabled) {
        errorResponse(res, `Service method ${service}.${method} is disabled`, 403)
        return
      }
      const nodeLevel = ROLE_HIERARCHY[permission.min_role] ?? 0
      if (nodeLevel > userLevel) {
        errorResponse(res, `You don't have permission to use ${service}.${method}. Requires ${permission.min_role} role.`, 403)
        return
      }
    }
  }

  const workflow = await db.updateWorkflowTemplate(req.params.id, req.body)
  successResponse(res, workflow)
}))

router.delete('/:id', validateParams(workflowIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = buildOwnerFilter(req).params[0]
  const success = await db.deleteWorkflowTemplate(req.params.id, ownerId)
  if (!success) {
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

  const workflow = await db.getWorkflowTemplateById(id, ownerId)
  if (!workflow) {
    return errorResponse(res, 'Workflow not found', 404)
  }

  const nodes = JSON.parse(workflow.nodes_json)
  const edges = JSON.parse(workflow.edges_json)
  const executionId = `test_${Date.now()}`

  const serviceRegistry = getServiceNodeRegistryService()
  const workflowEngine = new WorkflowEngine(db, serviceRegistry)

  cronEvents.emitWorkflowTestStarted(id, executionId)

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

    cronEvents.emitWorkflowTestCompleted(id, executionId, { nodeResults, success: result.success })

    successResponse(res, {
      executionId,
      nodes: nodeResults,
      duration: result.totalDurationMs,
      status: result.success ? 'completed' : 'failed',
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Test run failed'
    cronEvents.emitWorkflowTestCompleted(id, executionId, null, errorMessage)
    errorResponse(res, errorMessage, 500)
  }
}))

export default router