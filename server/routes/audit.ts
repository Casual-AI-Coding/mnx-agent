import { Router } from 'express'
import { validateQuery } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service-async.js'
import { listAuditLogsQuerySchema } from '../validation/audit-schemas'
import type { AuditAction } from '../database/types'
import { successResponse, errorResponse } from '../middleware/api-response'

const router = Router()

router.get('/', validateQuery(listAuditLogsQuerySchema), asyncHandler(async (req, res) => {
  const {
    action,
    resource_type,
    resource_id,
    user_id,
    response_status,
    start_date,
    end_date,
    page,
    limit,
  } = req.query

  // Non-admin users can only see their own audit logs
  const effectiveUserId = req.user?.role === 'admin' || req.user?.role === 'super'
    ? (user_id as string | undefined)
    : req.user?.userId

  const db = await getDatabase()
  const result = await db.getAuditLogs({
    action: action as AuditAction | undefined,
    resource_type: resource_type as string | undefined,
    resource_id: resource_id as string | undefined,
    user_id: effectiveUserId,
    response_status: response_status ? Number(response_status) : undefined,
    start_date: start_date as string | undefined,
    end_date: end_date as string | undefined,
    page: Number(page),
    limit: Number(limit),
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
  const db = await getDatabase()
  
  // Non-admin users can only see stats for their own audit logs
  const userId = req.user?.role === 'admin' || req.user?.role === 'super'
    ? undefined
    : req.user?.userId

  const stats = await db.getAuditStats(userId)
  successResponse(res, stats)
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const log = await db.getAuditLogById(req.params.id)
  if (!log) {
    errorResponse(res, 'Audit log not found', 404)
    return
  }
  successResponse(res, log)
}))

export default router