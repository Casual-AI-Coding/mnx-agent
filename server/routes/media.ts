import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { successResponse, errorResponse, deletedResponse, createdResponse } from '../middleware/api-response'
import logger from '../lib/logger.js'
import { getMediaService } from '../service-registration.js'
import {
  listMediaQuerySchema,
  mediaIdParamsSchema,
  createMediaRecordSchema,
  updateMediaRecordSchema,
  batchDeleteSchema,
  batchDownloadSchema,
} from '../validation/media-schemas'
import { saveMediaFile, readMediaFile, deleteMediaFile, saveFromUrl } from '../lib/media-storage'
import { ExternalApiLogRepository } from '../repositories/external-api-log.repository.js'
import { getConnection } from '../database/connection.js'
import { generateMediaToken, verifyMediaToken } from '../lib/media-token.js'
import multer from 'multer'
import axios from 'axios'
import archiver from 'archiver'
import { buildOwnerFilter, getOwnerIdForInsert } from '../middleware/data-isolation.js'
import {
  createPaginatedResponse,
  withEntityNotFound,
} from '../utils/index.js'
import { access } from 'fs/promises'
import {
  buildRecoverableMediaCandidates,
  createMediaRecoveryPlan,
  type CreateMediaRecoveryPlanResult,
} from '../services/domain/media-recovery.service.js'
import {
  buildMediaListRouteOptions,
  parseBatchIds,
  parseMediaUploadFields,
  parseUploadFromUrlBody,
  parseUploadMetadata,
} from './media/media-route-helpers.js'

const router = Router()
const REMOTE_DOWNLOAD_TIMEOUT_MS = 30000
const REMOTE_DOWNLOAD_MAX_BYTES = 100 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
})

function getRecoveryPlanErrorMessage(result: Extract<CreateMediaRecoveryPlanResult, { ok: false }>, operation: string): string {
  switch (result.error) {
    case 'unsupported_operation':
      return `Unsupported operation for recovery: ${operation}`
    case 'invalid_log_response':
      return 'Failed to parse response body'
    case 'no_resource_url':
      return 'No resource URL found in response'
    case 'resource_url_not_found':
      return 'Specified resource_url not found in log response'
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

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
    routeOptions.pagination.limit
  ))
}))

router.get('/recoverable', asyncHandler(async (req, res) => {
  const ownerId = buildOwnerFilter(req).params[0]

  const conn = getConnection()
  const logRepo = new ExternalApiLogRepository(conn)

  const { logs } = await logRepo.queryLogs({
    status: 'success',
    user_id: ownerId ?? undefined,
    page: 1,
    limit: 1000,
    sort_by: 'created_at',
    sort_order: 'desc',
  })

  const mediaService = getMediaService()
  const existingMedia = await mediaService.getAll({ limit: 10000, offset: 0, visibilityOwnerId: ownerId, includeDeleted: true })
  const recoverable = buildRecoverableMediaCandidates({ logs, existingMedia: existingMedia.records })

  successResponse(res, { records: recoverable, total: recoverable.length })
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

router.post('/recover/:logId', asyncHandler(async (req, res) => {
  const logId = parseInt(req.params.logId, 10)
  if (isNaN(logId)) {
    errorResponse(res, 'Invalid log ID', 400)
    return
  }

  const conn = getConnection()
  const logRepo = new ExternalApiLogRepository(conn)
  const log = await logRepo.getById(String(logId))
  if (!log) {
    errorResponse(res, 'External API log not found', 404)
    return
  }

  if (log.status !== 'success' || !log.response_body) {
    errorResponse(res, 'Log is not a successful API call with response data', 400)
    return
  }

  const requestedResourceUrl = typeof req.body?.resource_url === 'string' ? req.body.resource_url : undefined
  const recoveryPlan = createMediaRecoveryPlan({ log, requestedResourceUrl })
  if (!recoveryPlan.ok) {
    errorResponse(res, getRecoveryPlanErrorMessage(recoveryPlan, log.operation), 400)
    return
  }

  try {
    const plan = recoveryPlan.value
    const { filepath, filename, size_bytes } = await saveFromUrl(plan.resourceUrl, plan.originalName, plan.type)

    const mediaService = getMediaService()
    const ownerId = buildOwnerFilter(req).params[0]
    const record = await mediaService.create({
      filename,
      original_name: plan.originalName,
      filepath,
      type: plan.type,
      mime_type: undefined,
      size_bytes,
      source: plan.source,
      metadata: plan.metadata,
    }, ownerId)

    successResponse(res, { message: 'Media recovered successfully', record })
  } catch (error) {
    logger.error({ error, logId, targetUrl: recoveryPlan.value.resourceUrl }, 'Failed to recover media from external API log')
    errorResponse(res, `Recovery failed: ${getErrorMessage(error)}`, 500)
  }
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
  const recordMap = new Map(records.map(r => [r.id, r]))

  const authorizedIds: string[] = []
  const results: Array<{ id: string; success: boolean; data?: unknown; error?: string }> = []

  for (const id of ids) {
    const record = recordMap.get(id)
    if (!record || record.is_deleted) {
      results.push({ id, success: false, error: 'Not authorized or not found' })
      continue
    }
    const isOwner = record.owner_id === userId
    const isSuperWithNoOwner = !record.owner_id && userRole === 'super'
    if (isOwner || isSuperWithNoOwner) {
      authorizedIds.push(id)
    } else {
      results.push({ id, success: false, error: 'Not authorized or not found' })
    }
  }

  if (authorizedIds.length > 0) {
    await db.batchTogglePublic(authorizedIds, isPublic, userId)
    for (const id of authorizedIds) {
      results.push({ id, success: true })
    }
  }

  successResponse(res, results)
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

  if (records.length !== ids.length) {
    const foundIds = new Set(records.map(r => r.id))
    const missingId = ids.find(id => !foundIds.has(id))
    errorResponse(res, `Media record not found: ${missingId}`, 404)
    return
  }

  if (records.some(r => r.is_deleted)) {
    const deletedId = records.find(r => r.is_deleted)?.id
    errorResponse(res, `Media record already deleted: ${deletedId}`, 404)
    return
  }

  const failedFiles: Array<{ id: string; filepath: string; error: string }> = []
  await Promise.all(
    records.map(r =>
      deleteMediaFile(r.filepath).catch(error => {
        failedFiles.push({ id: r.id, filepath: r.filepath, error: String(error) })
        logger.error({ filepath: r.filepath, recordId: r.id, error }, 'Failed to delete media file during batch delete')
      })
    )
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

router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  const db = getMediaService()
  if (!req.file) {
    errorResponse(res, 'No file uploaded', 400)
    return
  }

  const uploadFields = parseMediaUploadFields(req.body)
  if (!uploadFields.ok) {
    errorResponse(res, uploadFields.error, 400)
    return
  }
  const ownerId = getOwnerIdForInsert(req) ?? undefined

  const metadataResult = parseUploadMetadata(req.body.metadata)
  if (!metadataResult.ok) {
    errorResponse(res, metadataResult.error, 400)
    return
  }

  const { filepath, filename, size_bytes } = await saveMediaFile(
    req.file.buffer,
    req.file.originalname,
    uploadFields.type
  )

  const record = await db.create({
    filename,
    original_name: req.file.originalname,
    filepath,
    type: uploadFields.type,
    mime_type: req.file.mimetype,
    size_bytes,
    source: uploadFields.source,
    metadata: metadataResult.metadata,
  }, ownerId)

  createdResponse(res, record)
}))

router.post('/upload-from-url', asyncHandler(async (req, res) => {
  const db = getMediaService()
  const bodyResult = parseUploadFromUrlBody(req.body)
  const ownerId = getOwnerIdForInsert(req) ?? undefined

  if (!bodyResult.ok) {
    errorResponse(res, bodyResult.error, 400)
    return
  }

  const response = await axios.get(bodyResult.url, {
    responseType: 'arraybuffer',
    timeout: REMOTE_DOWNLOAD_TIMEOUT_MS,
    maxContentLength: REMOTE_DOWNLOAD_MAX_BYTES,
    maxBodyLength: REMOTE_DOWNLOAD_MAX_BYTES,
  })
  const buffer = Buffer.from(response.data)
  const finalFilename = bodyResult.filename || `image_${Date.now()}.png`

  const { filepath, filename: savedFilename, size_bytes } = await saveMediaFile(
    buffer,
    finalFilename,
    bodyResult.type
  )

  const record = await db.create({
    filename: savedFilename,
    original_name: finalFilename,
    filepath,
    type: bodyResult.type,
    mime_type: String(response.headers['content-type'] ?? 'application/octet-stream'),
    size_bytes,
    source: bodyResult.source,
    metadata: bodyResult.metadata,
  }, ownerId)

  createdResponse(res, record)
}))

router.get('/:id/token', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  if (!req.user) {
    errorResponse(res, 'Unauthorized', 401)
    return
  }

  const ownerId = buildOwnerFilter(req).params[0]
  const record = await db.getById(req.params.id, ownerId, true) // includePublic for visibility
  if (!record || record.is_deleted) {
    errorResponse(res, 'Media not found', 404)
    return
  }

  const token = generateMediaToken(req.params.id, req.user.userId)
  const downloadUrl = `/api/media/${req.params.id}/download?token=${token}`
  successResponse(res, { downloadUrl, token })
}))

router.get('/:id/download', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const { token } = req.query

  if (!token || typeof token !== 'string') {
    errorResponse(res, 'Missing download token', 401)
    return
  }

  const verified = verifyMediaToken(token)
  if (!verified.valid) {
    errorResponse(res, verified.error || 'Invalid token', 401)
    return
  }

  if (verified.mediaId !== req.params.id) {
    errorResponse(res, 'Token does not match media ID', 403)
    return
  }

  const record = await db.getById(req.params.id)
  if (!record || record.is_deleted) {
    errorResponse(res, 'Media not found', 404)
    return
  }

  const buffer = await readMediaFile(record.filepath)
  const fileSize = buffer.length

  res.setHeader('Content-Type', record.mime_type || 'application/octet-stream')
  res.setHeader('Content-Disposition', `inline; filename="${record.original_name || record.filename}"`)
  res.setHeader('Accept-Ranges', 'bytes')

  const range = req.headers.range
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunkSize = end - start + 1

    res.status(206)
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`)
    res.setHeader('Content-Length', chunkSize)
    res.send(buffer.slice(start, end + 1))
  } else {
    res.setHeader('Content-Length', fileSize)
    res.send(buffer)
  }
}))

router.post('/batch/download', validate(batchDownloadSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const idsResult = parseBatchIds(req.body)
  if (!idsResult.ok) {
    errorResponse(res, idsResult.error, 400)
    return
  }
  const ids = idsResult.ids
  // P0: 批量下载必须按当前用户 owner_id 过滤，防止跨租户读取
  const ownerId = buildOwnerFilter(req).params[0]
  const records = await db.getByIds(ids, ownerId)

  if (records.length === 0) {
    errorResponse(res, 'No valid media found', 404)
    return
  }

  // 审计记录：当请求 ID 数量与可访问记录数量不一致时静默记录
  if (records.length !== ids.length) {
    logger.warn(
      { requestedCount: ids.length, accessibleCount: records.length, userId: ownerId },
      'Batch download: some media IDs are inaccessible or do not exist'
    )
  }

  const archive = archiver('zip', { zlib: { level: 9 } })

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="media_batch_${Date.now()}.zip"`)

  archive.pipe(res)

  for (const record of records) {
    try {
      const buffer = await readMediaFile(record.filepath)
      const filename = record.original_name || record.filename
      archive.append(buffer, { name: filename })
    } catch (error) {
      logger.error(error, `Failed to add file ${record.filename} to zip`)
    }
  }

  archive.finalize()
}))
export default router
