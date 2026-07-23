import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { errorResponse, createdResponse } from '../../middleware/api-response.js'
import logger from '../../lib/logger.js'
import { getMediaService } from '../../service-registration.js'
import {
  saveMediaFromFile,
  saveStreamFromUrl,
} from '../../lib/media-storage.js'
import { getOwnerIdForInsert } from '../../middleware/data-isolation.js'
import { getErrorMessage } from '../../utils/index.js'
import {
  parseMediaUploadFields,
  parseUploadFromUrlBody,
  parseUploadMetadata,
} from './media-route-helpers.js'
import { cronEvents } from '../../services/websocket-service.js'
import multer from 'multer'
import { tmpdir } from 'os'
import { join } from 'path'
import { promises as fs } from 'fs'

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

async function cleanupTmpFile(filePath: string): Promise<void> {
  await fs.unlink(filePath).catch(error => {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn({ error, filePath }, 'Failed to clean up multer tmp file')
    }
  })
}

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
      uploadFields.type,
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

export default router
