import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service-async.js'
import { getServiceNodeRegistry } from '../services/service-node-registry'
import {
  workflowIdParamsSchema,
  createWorkflowSchema,
  updateWorkflowSchema,
  listWorkflowsQuerySchema,
} from '../validation/workflow-schemas'
import { buildOwnerFilter, getOwnerIdForInsert } from '../middleware/data-isolation.js'
import { ROLE_HIERARCHY } from '../types/workflow'

const router = Router()

router.get('/available-actions', asyncHandler(async (req, res) => {
  const userRole = req.user!.role

  const db = await getDatabase()
  const serviceRegistry = getServiceNodeRegistry(db)
  const nodes = await serviceRegistry.getAvailableNodes(userRole)

  const grouped = nodes.reduce<Record<string, unknown[]>>((acc, node) => {
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

  res.json({ success: true, data: grouped })
}))

router.get('/', validateQuery(listWorkflowsQuerySchema), asyncHandler(async (req, res) => {
  const { is_public, page, limit } = req.query
  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum
  const ownerId = buildOwnerFilter(req).params[0]

  const db = await getDatabase()
  
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

  res.json({
    success: true,
    data: {
      workflows: result.templates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
    },
  })
}))

router.get('/:id', validateParams(workflowIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const userId = req.user!.userId
  const userRole = req.user!.role

  const workflow = await db.getWorkflowTemplateById(req.params.id)
  if (!workflow) {
    res.status(404).json({ success: false, error: 'Workflow not found' })
    return
  }

  const hasAccess =
    workflow.owner_id === userId ||
    userRole === 'super' ||
    workflow.is_public ||
    await db.hasWorkflowPermission(req.params.id, userId)

  if (!hasAccess) {
    res.status(403).json({ success: false, error: 'You do not have access to this workflow' })
    return
  }

  res.json({ success: true, data: workflow })
}))

router.post('/', validate(createWorkflowSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const userRole = req.user!.role
  const ownerId = getOwnerIdForInsert(req) ?? undefined

  const { nodes_json } = req.body
  let actionNodes: Array<{ type: string; data: { config?: { service?: string; method?: string } } }> = []
  try {
    const parsed = JSON.parse(nodes_json)
    actionNodes = (parsed.nodes || []).filter((n: { type: string }) => n.type === 'action')
  } catch {
    res.status(400).json({ success: false, error: 'nodes_json must be valid JSON' })
    return
  }

  const userLevel = ROLE_HIERARCHY[userRole] ?? 0

  for (const node of actionNodes) {
    const config = node.data?.config || {}
    const { service, method } = config

    if (!service || !method) continue

    const permission = await db.getServiceNodePermission(service, method)

    if (!permission) {
      res.status(400).json({
        success: false,
        error: `Unknown service method: ${service}.${method}`
      })
      return
    }

    if (!permission.is_enabled) {
      res.status(403).json({
        success: false,
        error: `Service method ${service}.${method} is disabled`
      })
      return
    }

    const nodeLevel = ROLE_HIERARCHY[permission.min_role] ?? 0
    if (nodeLevel > userLevel) {
      res.status(403).json({
        success: false,
        error: `You don't have permission to use ${service}.${method}. Requires ${permission.min_role} role.`
      })
      return
    }
  }

  const workflow = await db.createWorkflowTemplate({
    name: req.body.name,
    description: req.body.description,
    nodes_json: req.body.nodes_json,
    edges_json: req.body.edges_json,
    is_public: req.body.is_template,
  }, ownerId)
  res.status(201).json({ success: true, data: workflow })
}))

router.put('/:id', validateParams(workflowIdParamsSchema), validate(updateWorkflowSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const userId = req.user!.userId
  const userRole = req.user!.role

  const existing = await db.getWorkflowTemplateById(req.params.id)
  if (!existing) {
    res.status(404).json({ success: false, error: 'Workflow not found' })
    return
  }

  const hasAccess =
    existing.owner_id === userId ||
    userRole === 'super'

  if (!hasAccess) {
    res.status(403).json({ success: false, error: 'You do not have permission to update this workflow' })
    return
  }

  if (req.body.nodes_json) {
    let actionNodes: Array<{ type: string; data: { config?: { service?: string; method?: string } } }> = []
    try {
      const parsed = JSON.parse(req.body.nodes_json)
      actionNodes = (parsed.nodes || []).filter((n: { type: string }) => n.type === 'action')
    } catch {
      res.status(400).json({ success: false, error: 'nodes_json must be valid JSON' })
      return
    }

    const userLevel = ROLE_HIERARCHY[userRole] ?? 0

    for (const node of actionNodes) {
      const config = node.data?.config || {}
      const { service, method } = config

      if (!service || !method) continue

      const permission = await db.getServiceNodePermission(service, method)

      if (!permission) {
        res.status(400).json({
          success: false,
          error: `Unknown service method: ${service}.${method}`
        })
        return
      }

      if (!permission.is_enabled) {
        res.status(403).json({
          success: false,
          error: `Service method ${service}.${method} is disabled`
        })
        return
      }

      const nodeLevel = ROLE_HIERARCHY[permission.min_role] ?? 0
      if (nodeLevel > userLevel) {
        res.status(403).json({
          success: false,
          error: `You don't have permission to use ${service}.${method}. Requires ${permission.min_role} role.`
        })
        return
      }
    }
  }

  const workflow = await db.updateWorkflowTemplate(req.params.id, req.body)
  res.json({ success: true, data: workflow })
}))

router.delete('/:id', validateParams(workflowIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const success = await db.deleteWorkflowTemplate(req.params.id, ownerId)
  if (!success) {
    res.status(404).json({ success: false, error: 'Workflow not found' })
    return
  }
  res.json({ success: true, data: { deleted: true } })
}))

export default router