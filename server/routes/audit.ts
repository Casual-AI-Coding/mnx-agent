import { Router } from 'express'
import { validateQuery } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getLogService } from '../service-registration.js'
import { listAuditLogsQuerySchema } from '../validation/audit-schemas'
import { successResponse } from '../middleware/api-response'
import { withEntityNotFound } from '../utils/index.js'

const router = Router()

router.get('/', validateQuery(listAuditLogsQuerySchema), asyncHandler(async (req, res) => {
  const query = listAuditLogsQuerySchema.parse(req.query)
  const {
    action,
    resource_type,
    resource_id,
    user_id,
    response_status,
    request_path,
    status_filter,
    start_date,
    end_date,
    page,
    limit,
    sort_by,
    sort_order,
  } = query

  // Non-admin users can only see their own audit logs
  const effectiveUserId = req.user?.role === 'admin' || req.user?.role === 'super'
    ? user_id
    : req.user?.userId

  let responseStatusFilter: number | undefined
  if (status_filter === 'success') {
    responseStatusFilter = 200
  } else if (status_filter === 'error') {
    responseStatusFilter = 400
  } else if (response_status) {
    responseStatusFilter = Number(response_status)
  }

  const logService = getLogService()
  const result = await logService.getAuditLogs({
    action,
    resource_type,
    resource_id,
    user_id: effectiveUserId,
    response_status: responseStatusFilter,
    request_path,
    start_date,
    end_date,
    page,
    limit,
    sort_by,
    sort_order,
  })

  successResponse(res, {
    logs: result.logs,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  })
}))

router.get('/stats', asyncHandler(async (req, res) => {
  const logService = getLogService()
  
  // Non-admin users can only see stats for their own audit logs
  const userId = req.user?.role === 'admin' || req.user?.role === 'super'
    ? undefined
    : req.user?.userId

  const stats = await logService.getAuditStats(userId)
  successResponse(res, stats)
}))

router.get('/paths', asyncHandler(async (req, res) => {
  const logService = getLogService()
  const userId = req.user?.role === 'admin' || req.user?.role === 'super'
    ? undefined
    : req.user?.userId

  const paths = await logService.getUniqueRequestPaths(userId)
  successResponse(res, { paths })
}))

router.get('/users', asyncHandler(async (req, res) => {
  const logService = getLogService()
  const userId = req.user?.role === 'admin' || req.user?.role === 'super'
    ? undefined
    : req.user?.userId

  const users = await logService.getUniqueAuditUsers(userId)
  successResponse(res, { users })
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const logService = getLogService()

  // Non-admin users can only see their own audit logs
  const ownerId = req.user?.role === 'admin' || req.user?.role === 'super'
    ? undefined
    : req.user?.userId

  const log = await logService.getAuditLogById(req.params.id, ownerId)
  if (!withEntityNotFound(log, res, 'Audit log')) return
  successResponse(res, log)
}))

export default router
