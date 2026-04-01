import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service-async.js'
import {
  workflowIdParamsSchema,
  createWorkflowSchema,
  updateWorkflowSchema,
  listWorkflowsQuerySchema,
} from '../validation/workflow-schemas'
import { buildOwnerFilter, getOwnerIdForInsert } from '../middleware/data-isolation.js'

const router = Router()

router.get('/', validateQuery(listWorkflowsQuerySchema), asyncHandler(async (req, res) => {
  const { is_template, page, limit } = req.query
  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum
  const ownerId = buildOwnerFilter(req).params[0]

  const db = await getDatabase()
  const workflows = await db.getAllWorkflowTemplates(ownerId)

  let filtered = workflows
  if (is_template === 'true') {
    filtered = workflows.filter(w => w.is_template)
  } else if (is_template === 'false') {
    filtered = workflows.filter(w => !w.is_template)
  }

  const total = filtered.length
  const paginated = filtered.slice(offset, offset + limitNum)

  res.json({
    success: true,
    data: {
      workflows: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  })
}))

router.get('/:id', validateParams(workflowIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const workflow = await db.getWorkflowTemplateById(req.params.id, ownerId)
  if (!workflow) {
    res.status(404).json({ success: false, error: 'Workflow not found' })
    return
  }
  res.json({ success: true, data: workflow })
}))

router.post('/', validate(createWorkflowSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  const workflow = await db.createWorkflowTemplate({
    name: req.body.name,
    description: req.body.description,
    nodes_json: req.body.nodes_json,
    edges_json: req.body.edges_json,
    is_template: req.body.is_template,
  }, ownerId)
  res.status(201).json({ success: true, data: workflow })
}))

router.put('/:id', validateParams(workflowIdParamsSchema), validate(updateWorkflowSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const workflow = await db.updateWorkflowTemplate(req.params.id, req.body, ownerId)
  if (!workflow) {
    res.status(404).json({ success: false, error: 'Workflow not found' })
    return
  }
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