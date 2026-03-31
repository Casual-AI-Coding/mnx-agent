import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../middleware/validate'
import { getDatabase } from '../database/service'
import {
  listMediaQuerySchema,
  mediaIdParamsSchema,
  createMediaRecordSchema,
  updateMediaRecordSchema,
} from '../validation/media-schemas'
import type { Request, Response } from 'express'

const router = Router()

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

export default router