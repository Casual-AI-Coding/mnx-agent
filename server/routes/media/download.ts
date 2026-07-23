import { Router } from 'express'
import { validate, validateParams } from '../../middleware/validate.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { successResponse, errorResponse } from '../../middleware/api-response.js'
import logger from '../../lib/logger.js'
import { getMediaService } from '../../service-registration.js'
import { createMediaReadStream } from '../../lib/media-storage.js'
import { generateMediaToken, verifyMediaToken } from '../../lib/media-token.js'
import { buildOwnerFilter } from '../../middleware/data-isolation.js'
import { parseBatchIds } from './media-route-helpers.js'
import { buildStreamingDownloadPlan } from './media-download-helpers.js'
import { buildBatchDownloadPlan } from './media-batch-helpers.js'
import { batchDownloadSchema, mediaIdParamsSchema } from '../../validation/media-schemas.js'
import { cronEvents } from '../../services/websocket-service.js'
import archiver from 'archiver'

const router = Router()

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
      'Batch download: some media IDs are inaccessible or do not exist',
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

export default router
