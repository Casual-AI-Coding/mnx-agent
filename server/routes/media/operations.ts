import { Router } from 'express'
import { validateParams } from '../../middleware/validate.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { successResponse, errorResponse } from '../../middleware/api-response.js'
import { getMediaService } from '../../service-registration.js'
import { buildOwnerFilter } from '../../middleware/data-isolation.js'
import { buildBatchPublicPlan } from './media-batch-helpers.js'
import { mediaIdParamsSchema } from '../../validation/media-schemas.js'

const router = Router()

router.patch('/:id/favorite', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()

  const ownerId = buildOwnerFilter(req).params[0]
  const record = await db.getById(req.params.id, ownerId, true) // includePublic for visibility
  if (!record) {
    errorResponse(res, 'Media record not found', 404)
    return
  }

  const userId = req.user?.userId
  if (!userId) {
    errorResponse(res, 'Unauthorized', 401)
    return
  }

  const result = await db.toggleFavorite(userId, req.params.id)

  successResponse(res, {
    mediaId: req.params.id,
    isFavorite: result.isFavorite,
    action: result.action,
  })
}))

router.patch('/:id/pin', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const userId = req.user?.userId
  if (!userId) {
    errorResponse(res, 'Unauthorized', 401)
    return
  }

  const ownerId = buildOwnerFilter(req).params[0]
  const record = await db.getById(req.params.id, ownerId, true)
  if (!record || record.is_deleted || (record.owner_id && record.owner_id !== userId)) {
    errorResponse(res, 'Media record not found', 404)
    return
  }

  const result = await db.togglePin(userId, req.params.id)
  successResponse(res, {
    mediaId: req.params.id,
    isPinned: result.isPinned,
    action: result.action,
  })
}))

router.patch('/:id/public', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const { id } = req.params
  const { isPublic } = req.body

  if (typeof isPublic !== 'boolean') {
    errorResponse(res, 'isPublic must be boolean', 400)
    return
  }

  const ownerId = buildOwnerFilter(req).params[0]
  const record = await db.getById(id, ownerId, true)
  if (!record || record.is_deleted) {
    errorResponse(res, 'Media record not found', 404)
    return
  }

  if (record.owner_id && record.owner_id !== req.user?.userId) {
    errorResponse(res, 'Media record not found', 404)
    return
  }

  const updated = await db.togglePublic(id, isPublic, ownerId)
  successResponse(res, updated)
}))

router.post('/batch/public', asyncHandler(async (req, res) => {
  const db = getMediaService()
  const { ids, isPublic } = req.body

  if (!Array.isArray(ids) || ids.length === 0) {
    errorResponse(res, 'ids must be non-empty array', 400)
    return
  }

  if (typeof isPublic !== 'boolean') {
    errorResponse(res, 'isPublic must be boolean', 400)
    return
  }

  const userId = req.user?.userId
  const userRole = req.user?.role
  const ownerId = buildOwnerFilter(req).params[0]

  const records = await db.getByIds(ids, ownerId)
  const publicPlan = buildBatchPublicPlan({
    requestedIds: ids,
    records,
    userId,
    userRole,
  })

  if (publicPlan.authorizedIds.length > 0) {
    await db.batchTogglePublic([...publicPlan.authorizedIds], isPublic, userId)
  }

  successResponse(res, publicPlan.results)
}))

export default router
