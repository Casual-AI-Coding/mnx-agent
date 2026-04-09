import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabaseService } from '../service-registration.js'
import {
  listTemplatesQuerySchema,
  templateIdParamsSchema,
  createTemplateSchema,
  updateTemplateSchema,
} from '../validation/template-schemas'
import { getOwnerId } from '../middleware/data-isolation.js'
import { successResponse, errorResponse, createdResponse, deletedResponse } from '../middleware/api-response'
import {
  getPaginationParams,
  createPaginationMeta,
  withEntityNotFound,
} from '../utils/index.js'

const router = Router()

router.get('/', validateQuery(listTemplatesQuerySchema), asyncHandler(async (req, res) => {
  const { category } = req.query
  const { page, limit, offset } = getPaginationParams(req.query)
  const ownerId = getOwnerId(req)

  const db = getDatabaseService()
  const result = await db.getPromptTemplates({
    category: category as string | undefined,
    limit,
    offset,
    ownerId,
  })

  successResponse(res, {
    templates: result.templates,
    pagination: createPaginationMeta(result.total, page, limit),
  })
}))

router.get('/:id', validateParams(templateIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = getOwnerId(req)
  const template = await db.getPromptTemplateById(req.params.id, ownerId)
  if (!withEntityNotFound(template, res, 'Template')) return
  successResponse(res, template)
}))

router.post('/', validate(createTemplateSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = getOwnerId(req)
  const template = await db.createPromptTemplate(req.body, ownerId)
  createdResponse(res, template)
}))

router.put('/:id', validateParams(templateIdParamsSchema), validate(updateTemplateSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = getOwnerId(req)
  const template = await db.updatePromptTemplate(req.params.id, req.body, ownerId)
  if (!withEntityNotFound(template, res, 'Template')) return
  successResponse(res, template)
}))

router.delete('/:id', validateParams(templateIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = getOwnerId(req)
  const success = await db.deletePromptTemplate(req.params.id, ownerId)
  if (!success) {
    errorResponse(res, 'Template not found', 404)
    return
  }
  deletedResponse(res)
}))

export default router
