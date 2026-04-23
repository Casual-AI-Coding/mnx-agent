import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { createdResponse, deletedResponse, successResponse } from '../middleware/api-response'
import { validate, validateParams, validateQuery } from '../middleware/validate'
import { getMaterialService } from '../service-registration.js'
import {
  createMaterialSchema,
  listMaterialsQuerySchema,
  materialIdParamsSchema,
} from '../validation/material-schemas.js'
import {
  createPaginatedResponse,
  getPaginationParams,
  withEntityNotFound,
} from '../utils/index.js'

const router = Router()

router.get('/', validateQuery(listMaterialsQuerySchema), asyncHandler(async (req, res) => {
  const materialService = getMaterialService()
  const ownerId = req.user?.userId
  const { page, limit, offset } = getPaginationParams(req.query)

  const result = await materialService.list({
    ownerId: ownerId ?? '',
    materialType: typeof req.query.material_type === 'string' ? req.query.material_type : undefined,
    limit,
    offset,
  })

  successResponse(res, createPaginatedResponse(result.records, result.total, page, limit))
}))

router.post('/', validate(createMaterialSchema), asyncHandler(async (req, res) => {
  const materialService = getMaterialService()
  const ownerId = req.user?.userId

  const material = await materialService.create({
    material_type: req.body.material_type,
    name: req.body.name,
    description: req.body.description,
    metadata: req.body.metadata,
  }, ownerId)

  createdResponse(res, material)
}))

router.get('/:id', validateParams(materialIdParamsSchema), asyncHandler(async (req, res) => {
  const materialService = getMaterialService()
  const ownerId = req.user?.userId
  const material = await materialService.getById(req.params.id, ownerId)

  if (!withEntityNotFound(material, res, 'Material')) return

  successResponse(res, material)
}))

router.get('/:id/detail', validateParams(materialIdParamsSchema), asyncHandler(async (req, res) => {
  const materialService = getMaterialService()
  const ownerId = req.user?.userId
  const detail = await materialService.getMaterialDetail(req.params.id, ownerId)

  if (!withEntityNotFound(detail, res, 'Material')) return

  successResponse(res, detail)
}))

router.delete('/:id', validateParams(materialIdParamsSchema), asyncHandler(async (req, res) => {
  const materialService = getMaterialService()
  const ownerId = req.user?.userId
  const deleted = await materialService.softDelete(req.params.id, ownerId)

  if (!deleted) {
    res.status(404).json({
      success: false,
      error: 'Material not found',
    })
    return
  }

  deletedResponse(res)
}))

export default router
