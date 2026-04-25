import { Router } from 'express'
import { validate, validateQuery } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { createdResponse, errorResponse, successResponse } from '../middleware/api-response'
import { withEntityNotFound } from '../utils/index.js'
import {
  createExternalApiLogSchema,
  listExternalApiLogsQuerySchema,
  updateExternalApiLogSchema,
} from '../validation/external-api-logs-schemas'
import { getDatabaseService } from '../service-registration.js'
import { ExternalApiLogRepository } from '../repositories/external-api-log.repository'
import type { ServiceProvider, ExternalApiStatus } from '../database/types.js'

const router = Router()

router.get('/', validateQuery(listExternalApiLogsQuerySchema), asyncHandler(async (req, res) => {
  const {
    service_provider,
    status,
    operation,
    user_id,
    start_date,
    end_date,
    page,
    limit,
    sort_by,
    sort_order,
  } = req.query

  const effectiveUserId = req.user?.role === 'admin' || req.user?.role === 'super'
    ? (user_id as string | undefined)
    : req.user?.userId

  const db = getDatabaseService()
  const result = await db.getExternalApiLogs({
    service_provider: service_provider as ServiceProvider | undefined,
    status: status as ExternalApiStatus | undefined,
    operation: operation as string | undefined,
    user_id: effectiveUserId,
    start_date: start_date as string | undefined,
    end_date: end_date as string | undefined,
    page: Number(page),
    limit: Number(limit),
    sort_by: sort_by as 'created_at' | 'duration_ms' | undefined,
    sort_order: sort_order as 'asc' | 'desc' | undefined,
  })

  const currentLimit = Number(limit)
  successResponse(res, {
    logs: result.logs,
    pagination: {
      page: Number(page),
      limit: currentLimit,
      total: result.total,
      totalPages: Math.ceil(result.total / currentLimit),
    },
  })
}))

router.get('/stats', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const userId = req.user?.role === 'admin' || req.user?.role === 'super'
    ? undefined
    : req.user?.userId

  const stats = await db.getExternalApiLogStats(userId)
  successResponse(res, stats)
}))

router.get('/operations', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const userId = req.user?.role === 'admin' || req.user?.role === 'super'
    ? undefined
    : req.user?.userId

  const operations = await db.getUniqueExternalApiOperations(userId)
  successResponse(res, { operations })
}))

router.get('/providers', asyncHandler(async (_req, res) => {
  const db = getDatabaseService()
  const providers = await db.getUniqueExternalApiProviders()
  successResponse(res, { providers })
}))

router.post('/', validate(createExternalApiLogSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const repository = new ExternalApiLogRepository(db.getConnection())
  const userId = req.user?.userId

  if (!userId) {
    errorResponse(res, 'Unauthorized', 401)
    return
  }

  const body = createExternalApiLogSchema.parse(req.body)
  const record = await repository.create({
    service_provider: body.service_provider,
    api_endpoint: body.api_endpoint,
    operation: body.operation,
    request_params: body.request_params,
    request_body: body.request_body,
    response_body: body.response_body,
    status: body.status,
    error_message: body.error_message,
    duration_ms: body.duration_ms,
    trace_id: body.trace_id,
    user_id: userId,
  })

  createdResponse(res, record)
}))

router.patch('/:id', validate(updateExternalApiLogSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const repository = new ExternalApiLogRepository(db.getConnection())
  const current = await repository.getById(req.params.id)

  if (!current) {
    errorResponse(res, 'External API log not found', 404)
    return
  }

  const role = req.user?.role
  const userId = req.user?.userId
  const canUpdate = role === 'super' || role === 'admin' || current.user_id === userId

  if (!canUpdate) {
    errorResponse(res, 'External API log not found', 404)
    return
  }

  const updated = await repository.updateResult(req.params.id, req.body)
  if (!withEntityNotFound(updated, res, 'External API log')) return

  successResponse(res, updated)
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const log = await db.getExternalApiLogById(Number(req.params.id))
  
  if (req.user?.role !== 'admin' && req.user?.role !== 'super') {
    if (log && log.user_id !== req.user?.userId) {
      if (!withEntityNotFound(null, res, 'External API log')) return
    }
  }
  
  if (!withEntityNotFound(log, res, 'External API log')) return
  successResponse(res, log)
}))

export default router
