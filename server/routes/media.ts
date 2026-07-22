import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { successResponse, errorResponse, deletedResponse, createdResponse } from '../middleware/api-response'
import logger from '../lib/logger.js'
import { getExternalApiLogRepository, getMediaService } from '../service-registration.js'
import {
  listMediaQuerySchema,
  mediaIdParamsSchema,
  createMediaRecordSchema,
  updateMediaRecordSchema,
  batchDeleteSchema,
  batchDownloadSchema,
} from '../validation/media-schemas'
import {
  saveMediaFromFile,
  saveStreamFromUrl,
  deleteMediaFile,
  saveFromUrl,
  createMediaReadStream,
} from '../lib/media-storage'
import { generateMediaToken, verifyMediaToken } from '../lib/media-token.js'
import multer from 'multer'
import archiver from 'archiver'
import { tmpdir } from 'os'
import { join } from 'path'
import { promises as fs } from 'fs'
import { buildOwnerFilter, getOwnerIdForInsert } from '../middleware/data-isolation.js'
import {
  createPaginatedResponse,
  withEntityNotFound,
} from '../utils/index.js'
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
import { buildStreamingDownloadPlan } from './media/media-download-helpers.js'
import { buildBatchDownloadPlan, buildBatchPublicPlan, validateBatchDeleteRecords } from './media/media-batch-helpers.js'
import { cronEvents } from '../services/websocket-service.js'

const router = Router()
const REMOTE_DOWNLOAD_TIMEOUT_MS = 30000
const REMOTE_DOWNLOAD_MAX_BYTES = 100 * 1024 * 1024
const UPLOAD_TMP_DIR = process.env.UPLOAD_TMP_DIR || join(tmpdir(), 'mnx-agent-uploads')
const UPLOAD_MAX_BYTES = 100 * 1024 * 1024

void fs.mkdir(UPLOAD_TMP_DIR, { recursive: true }).catch(error => {
  logger.error({ error, dir: UPLOAD_TMP_DIR }, 'Failed to ensure upload tmp dir at startup')
})

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_TMP_DIR,
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Buffer.from(file.originalname).toString('base64url').slice(0, 32)}`
      cb(null, unique)
    },
  }),
  limits: { fileSize: UPLOAD_MAX_BYTES },
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

  const logRepo = getExternalApiLogRepository()

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

  const logRepo = getExternalApiLogRepository()
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
    await cleanupTmpFile(req.file.path)
    return
  }
  const ownerId = getOwnerIdForInsert(req) ?? undefined

  const metadataResult = parseUploadMetadata(req.body.metadata)
  if (!metadataResult.ok) {
    errorResponse(res, metadataResult.error, 400)
    await cleanupTmpFile(req.file.path)
    return
  }

  try {
    const { filepath, filename, size_bytes } = await saveMediaFromFile(
      req.file.path,
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

    cronEvents.emitMediaUploadCompleted({
      recordId: record.id,
      ownerId,
      type: uploadFields.type,
      sizeBytes: size_bytes,
      source: uploadFields.source ?? 'upload',
    })

    createdResponse(res, record)
  } finally {
    await cleanupTmpFile(req.file.path)
  }
}))

async function cleanupTmpFile(filePath: string): Promise<void> {
  await fs.unlink(filePath).catch(error => {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn({ error, filePath }, 'Failed to clean up multer tmp file')
    }
  })
}

router.post('/upload-from-url', asyncHandler(async (req, res) => {
  const db = getMediaService()
  const bodyResult = parseUploadFromUrlBody(req.body)
  const ownerId = getOwnerIdForInsert(req) ?? undefined

  if (!bodyResult.ok) {
    errorResponse(res, bodyResult.error, 400)
    return
  }

  let saved: { filepath: string; filename: string; size_bytes: number }
  try {
    saved = await saveStreamFromUrl(
      bodyResult.url,
      bodyResult.filename ?? `image_${Date.now()}.png`,
      bodyResult.type,
      undefined,
      {
        timeoutMs: REMOTE_DOWNLOAD_TIMEOUT_MS,
        maxBytes: REMOTE_DOWNLOAD_MAX_BYTES,
      },
    )
  } catch (error) {
    const message = getErrorMessage(error)
    logger.warn({ url: bodyResult.url, error: message }, 'upload-from-url: remote download failed')
    errorResponse(res, `Remote download failed: ${message}`, 502)
    return
  }

  const { filepath, filename: savedFilename, size_bytes } = saved
  const finalFilename = bodyResult.filename || `image_${Date.now()}.png`

  const record = await db.create({
    filename: savedFilename,
    original_name: finalFilename,
    filepath,
    type: bodyResult.type,
    mime_type: 'application/octet-stream',
    size_bytes,
    source: bodyResult.source,
    metadata: bodyResult.metadata,
  }, ownerId)

  cronEvents.emitMediaUploadCompleted({
    recordId: record.id,
    ownerId,
    type: bodyResult.type,
    sizeBytes: size_bytes,
    source: bodyResult.source ?? 'upload_from_url',
  })

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

  let readResult
  try {
    readResult = await createMediaReadStream(record.filepath, undefined, undefined)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.error({ recordId: record.id, filepath: record.filepath }, 'Media file missing on disk during download')
      errorResponse(res, 'Media file not found on disk', 404)
      return
    }
    throw error
  }

  const downloadPlan = buildStreamingDownloadPlan({
    fileSize: readResult.size,
    filename: record.filename,
    originalName: record.original_name,
    mimeType: record.mime_type,
    rangeHeader: req.headers.range,
  })

  for (const [name, value] of Object.entries(downloadPlan.headers)) {
    res.setHeader(name, value)
  }
  res.status(downloadPlan.statusCode)

  cronEvents.emitMediaDownloadCompleted({
    recordId: record.id,
    ownerId: record.owner_id ?? undefined,
    sizeBytes: readResult.size,
  })

  if (downloadPlan.range) {
    const ranged = await createMediaReadStream(record.filepath, undefined, {
      start: downloadPlan.range.start,
      end: downloadPlan.range.end,
    })
    ranged.stream.pipe(res)
    return
  }

  readResult.stream.pipe(res)
}))

router.post('/batch/download', validate(batchDownloadSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const idsResult = parseBatchIds(req.body)
  if (!idsResult.ok) {
    errorResponse(res, idsResult.error, 400)
    return
  }
  const ids = idsResult.ids
  const ownerId = buildOwnerFilter(req).params[0]
  const records = await db.getByIds(ids, ownerId)

  if (records.length === 0) {
    errorResponse(res, 'No valid media found', 404)
    return
  }
  const downloadPlan = buildBatchDownloadPlan({
    requestedIds: ids,
    records,
    timestamp: Date.now(),
  })

  if (downloadPlan.inaccessibleSummary) {
    logger.warn(
      { ...downloadPlan.inaccessibleSummary, userId: ownerId },
      'Batch download: some media IDs are inaccessible or do not exist'
    )
  }

  const archive = archiver('zip', { zlib: { level: 9 } })

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${downloadPlan.archiveFilename}"`)

  archive.pipe(res)

  const seenFilenames = new Set<string>()
  for (const record of downloadPlan.records) {
    try {
      const filename = pickUniqueBatchName(
        record.original_name || record.filename,
        seenFilenames,
      )
      seenFilenames.add(filename)
      archive.file(record.filepath, { name: filename })
    } catch (error) {
      logger.error(error, `Failed to add file ${record.filename} to zip`)
    }
  }

  const totalBytes = downloadPlan.records.reduce((sum, r) => sum + (r.size_bytes ?? 0), 0)
  cronEvents.emitMediaBatchDownloaded({
    ownerId: ownerId ?? undefined,
    recordCount: downloadPlan.records.length,
    totalBytes,
  })

  archive.finalize()
}))

function pickUniqueBatchName(name: string, seen: Set<string>): string {
  if (!seen.has(name)) return name
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let i = 1
  let candidate = `${stem} (${i})${ext}`
  while (seen.has(candidate)) {
    i += 1
    candidate = `${stem} (${i})${ext}`
  }
  return candidate
}
export default router
