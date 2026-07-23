import { Router } from 'express'
import {
  validate,
  validateQuery,
  validateParams,
} from '../../middleware/validate.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import {
  successResponse,
  errorResponse,
  deletedResponse,
  createdResponse,
} from '../../middleware/api-response.js'
import logger from '../../lib/logger.js'
import { getMediaService } from '../../service-registration.js'
import {
  listMediaQuerySchema,
  mediaIdParamsSchema,
  createMediaRecordSchema,
  updateMediaRecordSchema,
  batchDeleteSchema,
} from '../../validation/media-schemas.js'
import { deleteMediaFile } from '../../lib/media-storage.js'
import {
  buildOwnerFilter,
  getOwnerIdForInsert,
} from '../../middleware/data-isolation.js'
import {
  createPaginatedResponse,
  withEntityNotFound,
} from '../../utils/index.js'
import {
  buildMediaListRouteOptions,
  parseBatchIds,
} from './media-route-helpers.js'
import { validateBatchDeleteRecords } from './media-batch-helpers.js'

const router = Router()

router.get('/', validateQuery(listMediaQuerySchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const userId = req.user?.userId ? req.user.userId : undefined
  const role = req.user?.role

  const ownerFilter = buildOwnerFilter(req)
  const visibilityOwnerId = ownerFilter.ownerId
  const routeOptions = buildMediaListRouteOptions({
    query: req.query,
    userId,
    role,
    visibilityOwnerId,
  })

  const result = await db.getAll(routeOptions.mediaOptions)
  successResponse(res, createPaginatedResponse(
    result.records,
    result.total,
    routeOptions.pagination.page,
    routeOptions.pagination.limit,
  ))
}))

router.get('/:id', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const ownerId = buildOwnerFilter(req).params[0]
  const record = await db.getById(req.params.id, ownerId, true) // includePublic for visibility
  const includeDeleted = req.query.includeDeleted === 'true'

  if (!withEntityNotFound(record, res, 'Media record')) return
  if (!includeDeleted && record.is_deleted) {
    errorResponse(res, 'Media record not found', 404)
    return
  }
  successResponse(res, record)
}))

router.post('/', validate(createMediaRecordSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  const record = await db.create(req.body, ownerId)
  createdResponse(res, record)
}))

router.put('/:id', validateParams(mediaIdParamsSchema), validate(updateMediaRecordSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const ownerId = buildOwnerFilter(req).params[0]
  const record = await db.update(req.params.id, req.body, ownerId)
  if (!withEntityNotFound(record, res, 'Media record')) return
  successResponse(res, record)
}))

router.delete('/batch', validate(batchDeleteSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const idsResult = parseBatchIds(req.body)
  if (!idsResult.ok) {
    errorResponse(res, idsResult.error, 400)
    return
  }
  const ids = idsResult.ids
  const ownerId = buildOwnerFilter(req).params[0]

  const records = await db.getByIds(ids, ownerId)
  const deleteValidation = validateBatchDeleteRecords({ requestedIds: ids, records })
  if (!deleteValidation.ok) {
    errorResponse(res, deleteValidation.error, deleteValidation.statusCode)
    return
  }

  const failedFiles: Array<{ id: string; filepath: string; error: string }> = []
  await Promise.all(
    deleteValidation.records.map(r =>
      deleteMediaFile(r.filepath).catch(error => {
        failedFiles.push({ id: r.id, filepath: r.filepath, error: String(error) })
        logger.error({ filepath: r.filepath, recordId: r.id, error }, 'Failed to delete media file during batch delete')
      }),
    ),
  )

  const result = await db.softDeleteBatch(ids, ownerId)
  successResponse(res, { deleted: result.deleted, failed: result.failed, failedFiles })
}))

router.delete('/:id', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const ownerId = buildOwnerFilter(req).params[0]

  const record = await db.getById(req.params.id, ownerId)
  if (!withEntityNotFound(record, res, 'Media record')) return
  if (record.is_deleted) {
    errorResponse(res, 'Media record not found', 404)
    return
  }

  let fileDeletionError: string | undefined
  await deleteMediaFile(record.filepath).catch(error => {
    fileDeletionError = String(error)
    logger.error({ filepath: record.filepath, recordId: record.id, error }, 'Failed to delete media file')
  })

  const success = await db.softDelete(req.params.id, ownerId)
  if (!success) {
    errorResponse(res, 'Media record not found', 404)
    return
  }
  deletedResponse(res, fileDeletionError ? { fileDeletionError } : undefined)
}))

export default router
