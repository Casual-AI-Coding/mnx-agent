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
import { getOwnerId } from '../middleware/data-isolation.js'
import { successResponse, errorResponse } from '../middleware/api-response'

const router = Router()

router.get('/', validateQuery(listTemplatesQuerySchema), asyncHandler(async (req, res) => {
  const { category, page, limit } = req.query

  // Cache converted values
  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum
  const ownerId = getOwnerId(req)

  const db = await getDatabase()
  const result = await db.getPromptTemplates({
    category: category as string | undefined,
    limit: limitNum,
    offset,
    ownerId,
  })

  successResponse(res, {
    templates: result.templates,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      totalPages: Math.ceil(result.total / limitNum),
    }
  })
}))

router.get('/:id', validateParams(templateIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerId(req)
  const template = await db.getPromptTemplateById(req.params.id, ownerId)
  if (!template) {
    errorResponse(res, 'Template not found', 404)
    return
  }
  successResponse(res, template)
}))

router.post('/', validate(createTemplateSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerId(req)
  const template = await db.createPromptTemplate(req.body, ownerId)
  res.status(201).json({ success: true, data: template })
}))

router.put('/:id', validateParams(templateIdParamsSchema), validate(updateTemplateSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerId(req)
  const template = await db.updatePromptTemplate(req.params.id, req.body, ownerId)
  if (!template) {
    errorResponse(res, 'Template not found', 404)
    return
  }
  successResponse(res, template)
}))

router.delete('/:id', validateParams(templateIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerId(req)
  const success = await db.deletePromptTemplate(req.params.id, ownerId)
  if (!success) {
    errorResponse(res, 'Template not found', 404)
    return
  }
  successResponse(res, { deleted: true })
}))

export default router
