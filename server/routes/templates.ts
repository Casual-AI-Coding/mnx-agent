import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service'
import {
  listTemplatesQuerySchema,
  templateIdParamsSchema,
  createTemplateSchema,
  updateTemplateSchema,
} from '../validation/template-schemas'

const router = Router()

router.get('/', validateQuery(listTemplatesQuerySchema), asyncHandler(async (req, res) => {
  const { category, page, limit } = req.query
  const offset = (Number(page) - 1) * Number(limit)

  const result = getDatabase().getPromptTemplates({
    category: category as string | undefined,
    limit: Number(limit),
    offset,
  })

  res.json({
    success: true,
    data: {
      templates: result.templates,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / Number(limit)),
      }
    }
  })
}))

router.get('/:id', validateParams(templateIdParamsSchema), asyncHandler(async (req, res) => {
  const template = getDatabase().getPromptTemplateById(req.params.id)
  if (!template) {
    res.status(404).json({ success: false, error: 'Template not found' })
    return
  }
  res.json({ success: true, data: template })
}))

router.post('/', validate(createTemplateSchema), asyncHandler(async (req, res) => {
  const template = getDatabase().createPromptTemplate(req.body)
  res.status(201).json({ success: true, data: template })
}))

router.put('/:id', validateParams(templateIdParamsSchema), validate(updateTemplateSchema), asyncHandler(async (req, res) => {
  const template = getDatabase().updatePromptTemplate(req.params.id, req.body)
  if (!template) {
    res.status(404).json({ success: false, error: 'Template not found' })
    return
  }
  res.json({ success: true, data: template })
}))

router.delete('/:id', validateParams(templateIdParamsSchema), asyncHandler(async (req, res) => {
  const success = getDatabase().deletePromptTemplate(req.params.id)
  if (!success) {
    res.status(404).json({ success: false, error: 'Template not found' })
    return
  }
  res.json({ success: true, data: { deleted: true } })
}))

export default router
