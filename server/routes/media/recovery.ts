import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { successResponse, errorResponse } from '../../middleware/api-response.js'
import logger from '../../lib/logger.js'
import { getExternalApiLogRepository, getMediaService } from '../../service-registration.js'
import { buildOwnerFilter } from '../../middleware/data-isolation.js'
import { getErrorMessage } from '../../utils/index.js'
import {
  buildRecoverableMediaCandidates,
  createMediaRecoveryPlan,
  type CreateMediaRecoveryPlanResult,
} from '../../services/domain/media-recovery.service.js'
import { saveFromUrl } from '../../lib/media-storage.js'

const router = Router()

function getRecoveryPlanErrorMessage(
  result: Extract<CreateMediaRecoveryPlanResult, { ok: false }>,
  operation: string,
): string {
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

export default router
