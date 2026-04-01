import { z } from 'zod'

// Format enum
export const exportFormatEnum = z.enum(['csv', 'json'])
export type ExportFormat = z.infer<typeof exportFormatEnum>

// Media type enum (matches media_records.type)
export const mediaTypeEnum = z.enum(['audio', 'image', 'video', 'music'])
export type MediaTypeFilter = z.infer<typeof mediaTypeEnum>

// Execution log query schema
export const executionLogsExportQuerySchema = z.object({
  format: exportFormatEnum,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(10000).default(1000),
})

export type ExecutionLogsExportQuery = z.infer<typeof executionLogsExportQuerySchema>

// Media records query schema
export const mediaRecordsExportQuerySchema = z.object({
  format: exportFormatEnum,
  type: mediaTypeEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(10000).default(1000),
})

export type MediaRecordsExportQuery = z.infer<typeof mediaRecordsExportQuerySchema>