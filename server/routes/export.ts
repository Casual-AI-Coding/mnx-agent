import { Router } from 'express'
import { validateQuery } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getExportService } from '../services/export-service'
import { buildOwnerFilter } from '../middleware/data-isolation.js'
import {
  executionLogsExportQuerySchema,
  mediaRecordsExportQuerySchema,
} from '../validation/export-schemas'

const router = Router()

router.get('/execution-logs', validateQuery(executionLogsExportQuerySchema), asyncHandler(async (req, res) => {
  const { format, startDate, endDate, page, limit } = req.query as unknown as {
    format: 'csv' | 'json'
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }

  const ownerId = buildOwnerFilter(req).params[0]

  const exportService = await getExportService()
  const result = await exportService.exportExecutionLogs({
    format,
    startDate,
    endDate,
    page,
    limit,
    ownerId,
  })

  res.setHeader('Content-Type', result.contentType)
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
  res.send(result.data)
}))

router.get('/media-records', validateQuery(mediaRecordsExportQuerySchema), asyncHandler(async (req, res) => {
  const { format, type, page, limit } = req.query as unknown as {
    format: 'csv' | 'json'
    type?: string
    page?: number
    limit?: number
  }

  const ownerId = buildOwnerFilter(req).params[0]

  const exportService = await getExportService()
  const result = await exportService.exportMediaRecords({
    format,
    type,
    page,
    limit,
    ownerId,
  })

  res.setHeader('Content-Type', result.contentType)
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
  res.send(result.data)
}))

export default router