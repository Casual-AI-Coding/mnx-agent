import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service-async.js'
import {
  listTemplatesQuerySchema,
  templateIdParamsSchema,
  createTemplateSchema,
  updateTemplateSchema,
} from '../validation/template-schemas'
import { buildOwnerFilter, getOwnerIdForInsert } from '../middleware/data-isolation.js'

const router = Router()

router.get('/', validateQuery(listTemplatesQuerySchema), asyncHandler(async (req, res) => {
  const { category, page, limit } = req.query

  // Cache converted values
  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum
  const ownerId = buildOwnerFilter(req).params[0]

  const db = await getDatabase()
  const result = await db.getPromptTemplates({
    category: category as string | undefined,
    limit: limitNum,
    offset,
    ownerId,
  })

  res.json({
    success: true,
    data: {
      templates: result.templates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      }
    }
  })
}))

router.get('/:id', validateParams(templateIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const template = await db.getPromptTemplateById(req.params.id, ownerId)
  if (!template) {
    res.status(404).json({ success: false, error: 'Template not found' })
    return
  }
  res.json({ success: true, data: template })
}))

router.post('/', validate(createTemplateSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  const template = await db.createPromptTemplate(req.body, ownerId)
  res.status(201).json({ success: true, data: template })
}))

router.put('/:id', validateParams(templateIdParamsSchema), validate(updateTemplateSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const template = await db.updatePromptTemplate(req.params.id, req.body, ownerId)
  if (!template) {
    res.status(404).json({ success: false, error: 'Template not found' })
    return
  }
  res.json({ success: true, data: template })
}))

router.delete('/:id', validateParams(templateIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const success = await db.deletePromptTemplate(req.params.id, ownerId)
  if (!success) {
    res.status(404).json({ success: false, error: 'Template not found' })
    return
  }
  res.json({ success: true, data: { deleted: true } })
}))

export default router
