import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getTemplateService } from '../service-registration.js'
import {
  compareTemplateVersionsQuerySchema,
  createTemplateVersionSchema,
  listTemplatesQuerySchema,
  templateIdParamsSchema,
  templateVersionParamsSchema,
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
  const { page, limit, offset } = getPaginationParams(req.query)
  const ownerId = getOwnerId(req)

  const templateService = getTemplateService()
  const result = await templateService.getTemplates({
    category: req.query.category as string | undefined,
    limit,
    offset,
    ownerId,
  })

  successResponse(res, {
    templates: result.items,
    pagination: createPaginationMeta(result.total, page, limit),
  })
}))

router.get('/:id', validateParams(templateIdParamsSchema), asyncHandler(async (req, res) => {
  const templateService = getTemplateService()
  const ownerId = getOwnerId(req)
  const template = await templateService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(template, res, 'Template')) return
  successResponse(res, template)
}))

router.get('/:id/versions', validateParams(templateIdParamsSchema), asyncHandler(async (req, res) => {
  const ownerId = req.user!.userId
  const templateService = getTemplateService()
  const template = await templateService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(template, res, 'Template')) return

  const versions = await templateService.getVersions(req.params.id, ownerId)
  successResponse(res, { versions })
}))

router.get(
  '/:id/versions/compare',
  validateParams(templateIdParamsSchema),
  validateQuery(compareTemplateVersionsQuerySchema),
  asyncHandler(async (req, res) => {
    const ownerId = req.user!.userId
    const templateService = getTemplateService()
    const template = await templateService.getById(req.params.id, ownerId)
    if (!withEntityNotFound(template, res, 'Template')) return

    const diffs = await templateService.compareVersions(
      req.params.id,
      Number(req.query.from),
      Number(req.query.to),
      ownerId
    )
    successResponse(res, { diffs })
  })
)

router.post(
  '/:id/versions',
  validateParams(templateIdParamsSchema),
  validate(createTemplateVersionSchema),
  asyncHandler(async (req, res) => {
    const ownerId = req.user!.userId
    const templateService = getTemplateService()
    const template = await templateService.getById(req.params.id, ownerId)
    if (!withEntityNotFound(template, res, 'Template')) return

    const version = await templateService.createVersion(req.params.id, ownerId, req.body.change_summary ?? null)
    createdResponse(res, version)
  })
)

router.post('/:id/versions/:versionId/rollback', validateParams(templateVersionParamsSchema), asyncHandler(async (req, res) => {
  const ownerId = req.user!.userId
  const templateService = getTemplateService()
  const template = await templateService.rollback(req.params.id, req.params.versionId, ownerId)
  if (!withEntityNotFound(template, res, 'Template version')) return
  successResponse(res, template)
}))

router.post('/', validate(createTemplateSchema), asyncHandler(async (req, res) => {
  const templateService = getTemplateService()
  const ownerId = getOwnerId(req)
  const template = await templateService.create(req.body, ownerId)
  createdResponse(res, template)
}))

router.put('/:id', validateParams(templateIdParamsSchema), validate(updateTemplateSchema), asyncHandler(async (req, res) => {
  const templateService = getTemplateService()
  const ownerId = getOwnerId(req)
  const template = await templateService.update(req.params.id, req.body, ownerId)
  if (!withEntityNotFound(template, res, 'Template')) return
  successResponse(res, template)
}))

router.delete('/:id', validateParams(templateIdParamsSchema), asyncHandler(async (req, res) => {
  const templateService = getTemplateService()
  const ownerId = getOwnerId(req)
  try {
    const deleted = await templateService.delete(req.params.id, ownerId)
    if (!deleted) {
      errorResponse(res, 'Template not found', 404)
      return
    }
    deletedResponse(res)
  } catch {
    errorResponse(res, 'Template not found', 404)
  }
}))

export default router
