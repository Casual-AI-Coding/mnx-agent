import { z } from 'zod'
import { mediaTypeEnum } from './schemas/enums.js'
import { idSchema } from './common.js'

export { mediaTypeEnum } from './schemas/enums.js'

export const mediaSourceEnum = z.enum(['voice_sync', 'voice_async', 'image_generation', 'video_generation', 'music_generation'])

// Handle boolean query params correctly: "false" string should become false, not true
const booleanQueryParam = z.preprocess(
  (val) => {
    if (typeof val === 'boolean') return val
    if (val === 'true') return true
    if (val === 'false') return false
    return undefined
  },
  z.boolean().optional()
)

export const listMediaQuerySchema = z.object({
  type: mediaTypeEnum.optional(),
  source: mediaSourceEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  includeDeleted: booleanQueryParam.default(false),
  favorite: booleanQueryParam,
  isPublic: booleanQueryParam,
  ownerId: z.string().optional(),
  ownerIdNot: z.string().optional(),
})

export const mediaIdParamsSchema = z.object({
  id: idSchema('media id'),
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
