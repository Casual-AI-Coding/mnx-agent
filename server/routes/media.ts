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
import { saveMediaFile, readMediaFile, deleteMediaFile } from '../lib/media-storage'
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