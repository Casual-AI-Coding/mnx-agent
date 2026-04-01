import { Router } from 'express'
import { validateQuery } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service-async.js'
import { listAuditLogsQuerySchema } from '../validation/audit-schemas'
import type { AuditAction } from '../database/types'

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

  const db = await getDatabase()
  const result = await db.getAuditLogs({
    action: action as AuditAction | undefined,
    resource_type: resource_type as string | undefined,
    resource_id: resource_id as string | undefined,
    user_id: user_id as string | undefined,
    response_status: response_status ? Number(response_status) : undefined,
    start_date: start_date as string | undefined,
    end_date: end_date as string | undefined,
    page: Number(page),
    limit: Number(limit),
  })

  const currentLimit = Number(limit)
  res.json({
    success: true,
    data: {
      logs: result.logs,
      pagination: {
        page: Number(page),
        limit: currentLimit,
        total: result.total,
        totalPages: Math.ceil(result.total / currentLimit),
      },
    },
  })
}))

router.get('/stats', asyncHandler(async (_req, res) => {
  const db = await getDatabase()
  const stats = await db.getAuditStats()
  res.json({
    success: true,
    data: stats,
  })
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const log = await db.getAuditLogById(req.params.id)
  if (!log) {
    res.status(404).json({ success: false, error: 'Audit log not found' })
    return
  }
  res.json({ success: true, data: log })
}))

export default router