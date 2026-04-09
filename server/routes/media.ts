import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { successResponse, errorResponse, deletedResponse, createdResponse } from '../middleware/api-response'
import { getDatabaseService } from '../service-registration.js'
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
  const db = getDatabaseService()
  const { type, source, includeDeleted } = req.query
  const { page, limit, offset } = getPaginationParams(req.query)
  const ownerId = buildOwnerFilter(req).params[0]

  const result = await db.getMediaRecords({
    type: type as any,
    source: source as any,
    limit,
    offset,
    includeDeleted: !!includeDeleted,
    ownerId,
  })

  successResponse(res, createPaginatedResponse(result.records, result.total, page, limit))
}))

router.get('/:id', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = buildOwnerFilter(req).params[0]
  const record = await db.getMediaRecordById(req.params.id, ownerId)
  const includeDeleted = req.query.includeDeleted === 'true'
  
  if (!withEntityNotFound(record, res, 'Media record')) return
  if (!includeDeleted && record.is_deleted) {
    errorResponse(res, 'Media record not found', 404)
    return
  }
  successResponse(res, record)
}))

router.post('/', validate(createMediaRecordSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  const record = await db.createMediaRecord(req.body, ownerId)
  createdResponse(res, record)
}))

router.put('/:id', validateParams(mediaIdParamsSchema), validate(updateMediaRecordSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = buildOwnerFilter(req).params[0]
  const record = await db.updateMediaRecord(req.params.id, req.body, ownerId)
  if (!withEntityNotFound(record, res, 'Media record')) return
  successResponse(res, record)
}))

router.delete('/batch', validate(batchDeleteSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const { ids } = req.body as { ids: string[] }
  const ownerId = buildOwnerFilter(req).params[0]

  const records = await Promise.all(
    ids.map(id => db.getMediaRecordById(id, ownerId))
  )

  await Promise.all(
    records
      .filter((r): r is NonNullable<typeof r> => r !== null && !r.is_deleted)
      .map(r => deleteMediaFile(r.filepath).catch(() => {}))
  )

  const result = await db.softDeleteMediaRecords(ids)
  successResponse(res, result)
}))

router.delete('/:id', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const ownerId = buildOwnerFilter(req).params[0]

  const record = await db.getMediaRecordById(req.params.id, ownerId)
  if (!withEntityNotFound(record, res, 'Media record')) return
  if (record.is_deleted) {
    errorResponse(res, 'Media record not found', 404)
    return
  }

  await deleteMediaFile(record.filepath).catch(() => {})

  const success = await db.softDeleteMediaRecord(req.params.id, ownerId)
  if (!success) {
    errorResponse(res, 'Media record not found', 404)
    return
  }
  deletedResponse(res)
}))

router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
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

  const record = await db.createMediaRecord({
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
  const db = getDatabaseService()
  const { url, filename, type, source } = req.body
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

  const record = await db.createMediaRecord({
    filename: savedFilename,
    original_name: finalFilename,
    filepath,
    type: type as any,
    mime_type: response.headers['content-type'],
    size_bytes,
    source: source as any,
  }, ownerId)

  createdResponse(res, record)
}))

router.get('/:id/token', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  if (!req.user) {
    errorResponse(res, 'Unauthorized', 401)
    return
  }

  const ownerId = buildOwnerFilter(req).params[0]
  const record = await db.getMediaRecordById(req.params.id, ownerId)
  if (!record || record.is_deleted) {
    errorResponse(res, 'Media not found', 404)
    return
  }

  const token = generateMediaToken(req.params.id, req.user.userId)
  const downloadUrl = `/api/media/${req.params.id}/download?token=${token}`
  successResponse(res, { downloadUrl, token })
}))

router.get('/:id/download', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
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

  const record = await db.getMediaRecordById(req.params.id)
  if (!record || record.is_deleted) {
    errorResponse(res, 'Media not found', 404)
    return
  }

  const buffer = await readMediaFile(record.filepath)
  res.setHeader('Content-Type', record.mime_type || 'application/octet-stream')
  res.setHeader('Content-Disposition', `inline; filename="${record.original_name || record.filename}"`)
  res.send(buffer)
}))

router.post('/batch/download', validate(batchDownloadSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const { ids } = req.body as { ids: string[] }
  const records = await db.getMediaRecordsByIds(ids)

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