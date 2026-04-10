import { Router } from 'express'
import { validateQuery } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabaseService } from '../service-registration.js'
import { listAuditLogsQuerySchema } from '../validation/audit-schemas'
import type { AuditAction } from '../database/types'
import { successResponse, errorResponse } from '../middleware/api-response'
import { withEntityNotFound } from '../utils/index.js'

const router = Router()

router.get('/', validateQuery(listAuditLogsQuerySchema), asyncHandler(async (req, res) => {
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
  } = req.query

  // Non-admin users can only see their own audit logs
  const effectiveUserId = req.user?.role === 'admin' || req.user?.role === 'super'
    ? (user_id as string | undefined)
    : req.user?.userId

  let responseStatusFilter: number | undefined
  if (status_filter === 'success') {
    responseStatusFilter = 200
  } else if (status_filter === 'error') {
    responseStatusFilter = 400
  } else if (response_status) {
    responseStatusFilter = Number(response_status)
  }

  const db = getDatabaseService()
  const result = await db.getAuditLogs({
    action: action as AuditAction | undefined,
    resource_type: resource_type as string | undefined,
    resource_id: resource_id as string | undefined,
    user_id: effectiveUserId,
    response_status: responseStatusFilter,
    request_path: request_path as string | undefined,
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
  
  // Non-admin users can only see stats for their own audit logs
  const userId = req.user?.role === 'admin' || req.user?.role === 'super'
    ? undefined
    : req.user?.userId

  const stats = await db.getAuditStats(userId)
  successResponse(res, stats)
}))

router.get('/paths', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const userId = req.user?.role === 'admin' || req.user?.role === 'super'
    ? undefined
    : req.user?.userId

  const paths = await db.getUniqueRequestPaths(userId)
  successResponse(res, { paths })
}))

router.get('/users', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const userId = req.user?.role === 'admin' || req.user?.role === 'super'
    ? undefined
    : req.user?.userId

  const users = await db.getUniqueAuditUsers(userId)
  successResponse(res, { users })
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const log = await db.getAuditLogById(req.params.id)
  if (!withEntityNotFound(log, res, 'Audit log')) return
  successResponse(res, log)
}))

export default router