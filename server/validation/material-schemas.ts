import { z } from 'zod'
import { idSchema } from './common.js'

export const materialTypeEnum = z.enum(['artist'])

export const materialItemTypeEnum = z.enum(['song'])

export const promptTargetTypeEnum = z.enum(['material-main', 'material-item'])

export const promptSlotTypeEnum = z.enum(['artist-style', 'song-style'])

const booleanQueryParam = z.preprocess(
  (val) => {
    if (typeof val === 'boolean') return val
    if (val === 'true') return true
    if (val === 'false') return false
    return undefined
  },
  z.boolean().optional()
)

export const listMaterialsQuerySchema = z.object({
  material_type: materialTypeEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const materialIdParamsSchema = z.object({
  id: idSchema('material id'),
})

export const createMaterialSchema = z.object({
  name: z.string().min(1).max(255),
  material_type: materialTypeEnum,
  description: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateMaterialSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export const createMaterialItemSchema = z.object({
  name: z.string().min(1).max(255),
  item_type: materialItemTypeEnum,
  lyrics: z.string().optional(),
  remark: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sort_order: z.number().int().min(0).optional(),
})

export const updateMaterialItemSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  lyrics: z.string().optional().nullable(),
  remark: z.string().max(1000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
})

export const materialItemIdParamsSchema = z.object({
  itemId: idSchema('material item id'),
})

export const reorderMaterialItemsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    sort_order: z.number().int().min(0),
  })).min(1),
})

export const createPromptSchema = z.object({
  target_type: promptTargetTypeEnum,
  target_id: z.string().uuid(),
  slot_type: promptSlotTypeEnum,
  name: z.string().min(1).max(255),
  content: z.string().min(1),
})

export const updatePromptSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
})

export const promptIdParamsSchema = z.object({
  promptId: idSchema('prompt id'),
})
