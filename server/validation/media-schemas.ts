import { z } from 'zod'
import { mediaTypeEnum } from './schemas/enums.js'

export { mediaTypeEnum } from './schemas/enums.js'

export const mediaSourceEnum = z.enum(['voice_sync', 'voice_async', 'image_generation', 'video_generation', 'music_generation'])

export const listMediaQuerySchema = z.object({
  type: mediaTypeEnum.optional(),
  source: mediaSourceEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
})

export const mediaIdParamsSchema = z.object({
  id: z.string().min(1),
})

export const createMediaRecordSchema = z.object({
  filename: z.string().min(1).max(255),
  original_name: z.string().max(255).optional(),
  filepath: z.string().min(1),
  type: mediaTypeEnum,
  mime_type: z.string().max(100).optional(),
  size_bytes: z.number().int().min(0),
  source: mediaSourceEnum.optional(),
  task_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateMediaRecordSchema = z.object({
  original_name: z.string().max(255).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const batchDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
})

export const batchDownloadSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
})
