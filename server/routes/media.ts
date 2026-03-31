import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { getDatabase } from '../database/service'
import {
  listMediaQuerySchema,
  mediaIdParamsSchema,
  createMediaRecordSchema,
  updateMediaRecordSchema,
} from '../validation/media-schemas'
import { saveMediaFile, readMediaFile, deleteMediaFile } from '../lib/media-storage'
import type { Request, Response } from 'express'
import multer from 'multer'
import axios from 'axios'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
})

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((error: Error & { code?: number }) => {
      const statusCode = error.code && error.code >= 100 && error.code < 600 ? error.code : 500
      res.status(statusCode).json({ success: false, error: error.message })
    })
  }
}

router.get('/', validateQuery(listMediaQuerySchema), asyncHandler(async (req, res) => {
  const { type, source, page, limit, includeDeleted } = req.query
  const offset = (Number(page) - 1) * Number(limit)

  const result = getDatabase().getMediaRecords({
    type: type as any,
    source: source as any,
    limit: Number(limit),
    offset,
    includeDeleted: !!includeDeleted,
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
  const record = getDatabase().getMediaRecordById(req.params.id)
  if (!record) {
    res.status(404).json({ success: false, error: 'Media record not found' })
    return
  }
  res.json({ success: true, data: record })
}))

router.post('/', validate(createMediaRecordSchema), asyncHandler(async (req, res) => {
  const record = getDatabase().createMediaRecord(req.body)
  res.status(201).json({ success: true, data: record })
}))

router.put('/:id', validateParams(mediaIdParamsSchema), validate(updateMediaRecordSchema), asyncHandler(async (req, res) => {
  const record = getDatabase().updateMediaRecord(req.params.id, req.body)
  if (!record) {
    res.status(404).json({ success: false, error: 'Media record not found' })
    return
  }
  res.json({ success: true, data: record })
}))

router.delete('/:id', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const success = getDatabase().softDeleteMediaRecord(req.params.id)
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

  const { filepath, filename, size_bytes } = await saveMediaFile(
    req.file.buffer,
    req.file.originalname,
    type as any
  )

  const record = getDatabase().createMediaRecord({
    filename,
    original_name: req.file.originalname,
    filepath,
    type: type as any,
    mime_type: req.file.mimetype,
    size_bytes,
    source: source as any,
  })

  res.status(201).json({ success: true, data: record })
}))

router.post('/upload-from-url', asyncHandler(async (req, res) => {
  const { url, filename, type, source } = req.body

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

  const record = getDatabase().createMediaRecord({
    filename: savedFilename,
    original_name: finalFilename,
    filepath,
    type: type as any,
    mime_type: response.headers['content-type'],
    size_bytes,
    source: source as any,
  })

  res.status(201).json({ success: true, data: record })
}))

router.get('/:id/download', validateParams(mediaIdParamsSchema), asyncHandler(async (req, res) => {
  const record = getDatabase().getMediaRecordById(req.params.id)
  if (!record || record.is_deleted) {
    res.status(404).json({ success: false, error: 'Media not found' })
    return
  }

  const buffer = await readMediaFile(record.filepath)
  res.setHeader('Content-Type', record.mime_type || 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${record.original_name || record.filename}"`)
  res.send(buffer)
}))

export default router