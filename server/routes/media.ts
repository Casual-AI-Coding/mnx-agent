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
  getPaginationParams,
  createPaginatedResponse,
  withEntityNotFound,
} from '../utils/index.js'
import { access } from 'fs/promises'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
})

router.get('/', validateQuery(listMediaQuerySchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const { type, source, search, includeDeleted, favoriteFilter, publicFilter } = req.query
  const { page, limit, offset } = getPaginationParams(req.query)
  const userId = req.user?.userId ? req.user.userId : undefined
  const role = req.user?.role

  const ownerFilter = buildOwnerFilter(req)
  const visibilityOwnerId = ownerFilter.ownerId

  const result = await db.getAll({
    type: type as any,
    source: source as any,
    search: search as string,
    limit,
    offset,
    includeDeleted: !!includeDeleted,
    visibilityOwnerId,
    favoriteFilter: favoriteFilter as ('favorite' | 'non-favorite')[] | undefined,
    publicFilter: publicFilter as ('private' | 'public' | 'others-public')[] | undefined,
    favoriteUserId: userId,
    role,
  })

  successResponse(res, createPaginatedResponse(result.records, result.total, page, limit))
}))

router.get('/recoverable', asyncHandler(async (req, res) => {
  const ownerId = buildOwnerFilter(req).params[0]

  const OPERATION_MEDIA_MAP: Record<string, { type: string; source: string; extractUrls: (responseData: any) => string[] }> = {
    image_generation: {
      type: 'image',
      source: 'image_generation',
      extractUrls: (responseData) => responseData?.image_urls ?? [],
    },
    music_generation: {
      type: 'music',
      source: 'music_generation',
      extractUrls: (responseData) => responseData?.data?.audio ? [responseData.data.audio] : [],
    },
    text_to_audio_sync: {
      type: 'audio',
      source: 'voice_sync',
      extractUrls: (responseData) => responseData?.data?.audio_url ? [responseData.data.audio_url] : [],
    },
  }

  const MEDIA_OPERATIONS = Object.keys(OPERATION_MEDIA_MAP)
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

  const mediaLogs = logs.filter(log => MEDIA_OPERATIONS.includes(log.operation))

  type LogWithUrls = { log: any; resourceUrls: string[]; opConfig: typeof OPERATION_MEDIA_MAP[string] }
  const logsWithUrls: LogWithUrls[] = []
  for (const log of mediaLogs) {
    if (!log.response_body) continue
    try {
      const responseData = JSON.parse(log.response_body)
      const opConfig = OPERATION_MEDIA_MAP[log.operation]
      const resourceUrls = opConfig.extractUrls(responseData)
      if (resourceUrls.length > 0) {
        logsWithUrls.push({ log, resourceUrls, opConfig })
      }
    } catch {
    }
  }

  const mediaService = getMediaService()
  const existingMedia = await mediaService.getAll({ limit: 10000, offset: 0, visibilityOwnerId: ownerId, includeDeleted: true })
  const existingSourceUrls = new Set<string>()
  for (const record of existingMedia.records) {
    if (record.metadata && typeof record.metadata === 'object') {
      const meta = record.metadata as Record<string, unknown>
      const sourceUrl = meta?.source_url
      if (typeof sourceUrl === 'string') existingSourceUrls.add(sourceUrl)
      const logId = meta?.external_api_log_id
      if (typeof logId === 'number') existingSourceUrls.add(`__log_${logId}`)
    }
  }

  const recoverable: Array<{
    log_id: number
    operation: string
    type: string
    source: string
    resource_url: string
    image_index?: number
    created_at: string
    metadata: Record<string, unknown>
  }> = []

  for (const { log, resourceUrls, opConfig } of logsWithUrls) {
    for (let i = 0; i < resourceUrls.length; i++) {
      const url = resourceUrls[i]
      if (existingSourceUrls.has(url)) continue
      if (existingSourceUrls.has(`__log_${log.id}`)) continue

      recoverable.push({
        log_id: log.id,
        operation: log.operation,
        type: opConfig.type,
        source: opConfig.source,
        resource_url: url,
        image_index: opConfig.type === 'image' ? i : undefined,
        created_at: log.created_at,
        metadata: {
          source_url: url,
          external_api_log_id: log.id,
          operation: log.operation,
          service_provider: log.service_provider,
        },
      })
    }
  }

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

  const OPERATION_MEDIA_MAP: Record<string, { type: string; source: string; ext: string; extractUrls: (responseData: any) => string[] }> = {
    image_generation: { type: 'image', source: 'image_generation', ext: '.png', extractUrls: (rd) => rd?.image_urls ?? [] },
    music_generation: { type: 'music', source: 'music_generation', ext: '.mp3', extractUrls: (rd) => rd?.data?.audio ? [rd.data.audio] : [] },
    text_to_audio_sync: { type: 'audio', source: 'voice_sync', ext: '.wav', extractUrls: (rd) => rd?.data?.audio_url ? [rd.data.audio_url] : [] },
  }

  const opConfig = OPERATION_MEDIA_MAP[log.operation]
  if (!opConfig) {
    errorResponse(res, `Unsupported operation for recovery: ${log.operation}`, 400)
    return
  }

  let allUrls: string[] = []
  let extraMetadata: Record<string, unknown> = {}
  try {
    const responseData = JSON.parse(log.response_body)
    allUrls = opConfig.extractUrls(responseData)
    if (opConfig.type === 'music') {
      extraMetadata = {
        song_title: responseData?.data?.song_title,
        lyrics: responseData?.data?.lyrics,
      }
    }
  } catch {
    errorResponse(res, 'Failed to parse response body', 400)
    return
  }

  if (allUrls.length === 0) {
    errorResponse(res, 'No resource URL found in response', 400)
    return
  }

  const targetUrl = (req.body?.resource_url as string) || allUrls[0]
  if (!allUrls.includes(targetUrl)) {
    errorResponse(res, 'Specified resource_url not found in log response', 400)
    return
  }

  try {
    const originalName = `${log.operation}_${logId}${opConfig.ext}`
    const { filepath, filename, size_bytes } = await saveFromUrl(targetUrl, originalName, opConfig.type as any)

    const mediaService = getMediaService()
    const ownerId = buildOwnerFilter(req).params[0]
    const record = await mediaService.create({
      filename,
      original_name: originalName,
      filepath,
      type: opConfig.type as any,
      mime_type: undefined,
      size_bytes,
      source: opConfig.source as any,
      metadata: {
        ...extraMetadata,
        source_url: targetUrl,
        external_api_log_id: log.id,
        operation: log.operation,
        service_provider: log.service_provider,
        restored_from_log: true,
      },
    }, ownerId)

    successResponse(res, { message: 'Media recovered successfully', record })
  } catch (error) {
    logger.error({ error, logId, targetUrl }, 'Failed to recover media from external API log')
    errorResponse(res, `Recovery failed: ${(error as Error).message}`, 500)
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

  const record = await db.getById(id)
  if (!record || record.is_deleted) {
    errorResponse(res, 'Media record not found', 404)
    return
  }

  if (record.owner_id) {
    if (record.owner_id !== req.user?.userId) {
      errorResponse(res, 'Only owner can toggle public status', 403)
      return
    }
  } else {
    if (req.user?.role !== 'super') {
      errorResponse(res, 'Only super can toggle public status for records without owner', 403)
      return
    }
  }

  const updated = await db.togglePublic(id, isPublic)
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
  const results = await Promise.all(
    ids.map(async (id: string) => {
      const record = await db.getById(id)
      if (record && !record.is_deleted) {
        const isOwner = record.owner_id === userId
        const isSuperWithNoOwner = !record.owner_id && userRole === 'super'
        if (isOwner || isSuperWithNoOwner) {
          const updated = await db.togglePublic(id, isPublic)
          return { id, success: true, data: updated }
        }
      }
      return { id, success: false, error: 'Not authorized or not found' }
    })
  )

  successResponse(res, results)
}))

router.delete('/batch', validate(batchDeleteSchema), asyncHandler(async (req, res) => {
  const db = getMediaService()
  const { ids } = req.body as { ids: string[] }
  const ownerId = buildOwnerFilter(req).params[0]

  const records = await Promise.all(
    ids.map(id => db.getById(id, ownerId))
  )

  await Promise.all(
    records
      .filter((r): r is NonNullable<typeof r> => r !== null && !r.is_deleted)
      .map(r => deleteMediaFile(r.filepath).catch(error => {
        logger.error({ filepath: r.filepath, recordId: r.id, error }, 'Failed to delete media file during batch delete')
      }))
  )

  await Promise.all(ids.map(id => db.softDelete(id, ownerId)))
  successResponse(res, { deleted: ids.length })
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

  await deleteMediaFile(record.filepath).catch(error => {
    logger.error({ filepath: record.filepath, recordId: record.id, error }, 'Failed to delete media file')
  })

  const success = await db.softDelete(req.params.id, ownerId)
  if (!success) {
    errorResponse(res, 'Media record not found', 404)
    return
  }
  deletedResponse(res)
}))

router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  const db = getMediaService()
  if (!req.file) {
    errorResponse(res, 'No file uploaded', 400)
    return
  }

  const type = req.body.type as string
  const source = req.body.source as string
  const ownerId = getOwnerIdForInsert(req) ?? undefined

  const { filepath, filename, size_bytes } = await saveMediaFile(
    req.file.buffer,
    req.file.originalname,
    type as any
  )

  const record = await db.create({
    filename,
    original_name: req.file.originalname,
    filepath,
    type: type as any,
    mime_type: req.file.mimetype,
    size_bytes,
    source: source as any,
  }, ownerId)

  createdResponse(res, record)
}))

router.post('/upload-from-url', asyncHandler(async (req, res) => {
  const db = getMediaService()
  const { url, filename, type, source, metadata } = req.body
  const ownerId = getOwnerIdForInsert(req) ?? undefined

  if (!url || !type) {
    errorResponse(res, 'url and type are required', 400)
    return
  }

  const response = await axios.get(url, { responseType: 'arraybuffer' })
  const buffer = Buffer.from(response.data)
  const finalFilename = filename || `image_${Date.now()}.png`

  const { filepath, filename: savedFilename, size_bytes } = await saveMediaFile(
    buffer,
    finalFilename,
    type as any
  )

  const record = await db.create({
    filename: savedFilename,
    original_name: finalFilename,
    filepath,
    type: type as any,
    mime_type: response.headers['content-type'],
    size_bytes,
    source: source as any,
    metadata: metadata || null,
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
  const { ids } = req.body as { ids: string[] }
  const records = await db.getByIds(ids)

  if (records.length === 0) {
    errorResponse(res, 'No valid media found', 404)
    return
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
      console.error(`Failed to add file ${record.filename} to zip:`, error)
    }
  }

  archive.finalize()
}))
export default router