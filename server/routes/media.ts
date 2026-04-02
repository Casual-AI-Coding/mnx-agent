import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service-async.js'
import {
  listMediaQuerySchema,
  mediaIdParamsSchema,
  createMediaRecordSchema,
  updateMediaRecordSchema,
  batchDeleteSchema,
  batchDownloadSchema,
} from '../validation/media-schemas'
import { saveMediaFile, readMediaFile } from '../lib/media-storage'
import { generateMediaToken, verifyMediaToken } from '../lib/media-token.js'
import multer from 'multer'
import axios from 'axios'
import archiver from 'archiver'
import { buildOwnerFilter, getOwnerIdForInsert } from '../middleware/data-isolation.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
})

router.get('/', validateQuery(listMediaQuerySchema), asyncHandler(async (req, res) => {
  const { type, source, page, limit, includeDeleted } = req.query
  const offset = (Number(page) - 1) * Number(limit)
  const ownerId = buildOwnerFilter(req).params[0]

  const db = await getDatabase()
  const result = await db.getMediaRecords({
    type: type as any,
    source: source as any,
    limit: Number(limit),
    offset,
    includeDeleted: !!includeDeleted,
    ownerId,
  })

  res.json({
    success: true,
    data: {
      records: result.records,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / Number(limit)),
      }
    }
  })
}))

router.get('/:id', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const record = await db.getMediaRecordById(req.params.id, ownerId)
  if (!record) {
    res.status(404).json({ success: false, error: 'Media record not found' })
    return
  }
  res.json({ success: true, data: record })
}))

router.post('/', validate(createMediaRecordSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  const record = await db.createMediaRecord(req.body, ownerId)
  res.status(201).json({ success: true, data: record })
}))

router.put('/:id', validateParams(mediaIdParamsSchema), validate(updateMediaRecordSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const record = await db.updateMediaRecord(req.params.id, req.body, ownerId)
  if (!record) {
    res.status(404).json({ success: false, error: 'Media record not found' })
    return
  }
  res.json({ success: true, data: record })
}))

router.delete('/batch', validate(batchDeleteSchema), asyncHandler(async (req, res) => {
  const { ids } = req.body as { ids: string[] }
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const result = await db.softDeleteMediaRecords(ids)
  res.json({ success: true, data: result })
}))

router.delete('/:id', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const success = await db.softDeleteMediaRecord(req.params.id, ownerId)
  if (!success) {
    res.status(404).json({ success: false, error: 'Media record not found' })
    return
  }
  res.json({ success: true, data: { deleted: true } })
}))

router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' })
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

  const db = await getDatabase()
  const record = await db.createMediaRecord({
    filename,
    original_name: req.file.originalname,
    filepath,
    type: type as any,
    mime_type: req.file.mimetype,
    size_bytes,
    source: source as any,
  }, ownerId)

  res.status(201).json({ success: true, data: record })
}))

router.post('/upload-from-url', asyncHandler(async (req, res) => {
  const { url, filename, type, source } = req.body
  const ownerId = getOwnerIdForInsert(req) ?? undefined

  if (!url || !type) {
    res.status(400).json({ success: false, error: 'url and type are required' })
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

  const db = await getDatabase()
  const record = await db.createMediaRecord({
    filename: savedFilename,
    original_name: finalFilename,
    filepath,
    type: type as any,
    mime_type: response.headers['content-type'],
    size_bytes,
    source: source as any,
  }, ownerId)

  res.status(201).json({ success: true, data: record })
}))

router.get('/:id/token', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const record = await db.getMediaRecordById(req.params.id, ownerId)
  if (!record || record.is_deleted) {
    res.status(404).json({ success: false, error: 'Media not found' })
    return
  }

  const token = generateMediaToken(req.params.id, req.user.userId)
  const downloadUrl = `/api/media/${req.params.id}/download?token=${token}`
  res.json({ success: true, data: { downloadUrl, token } })
}))

router.get('/:id/download', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const { token } = req.query

  if (!token || typeof token !== 'string') {
    res.status(401).json({ success: false, error: 'Missing download token' })
    return
  }

  const verified = verifyMediaToken(token)
  if (!verified.valid) {
    res.status(401).json({ success: false, error: verified.error || 'Invalid token' })
    return
  }

  if (verified.mediaId !== req.params.id) {
    res.status(403).json({ success: false, error: 'Token does not match media ID' })
    return
  }

  const db = await getDatabase()
  const record = await db.getMediaRecordById(req.params.id)
  if (!record || record.is_deleted) {
    res.status(404).json({ success: false, error: 'Media not found' })
    return
  }

  const buffer = await readMediaFile(record.filepath)
  res.setHeader('Content-Type', record.mime_type || 'application/octet-stream')
  res.setHeader('Content-Disposition', `inline; filename="${record.original_name || record.filename}"`)
  res.send(buffer)
}))

router.post('/batch/download', validate(batchDownloadSchema), asyncHandler(async (req, res) => {
  const { ids } = req.body as { ids: string[] }
  const db = await getDatabase()
  const records = await db.getMediaRecordsByIds(ids)

  if (records.length === 0) {
    res.status(404).json({ success: false, error: 'No valid media found' })
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