import { z } from 'zod'
import { idSchema } from './common.js'

export const promptTargetTypeEnum = z.enum(['material-main', 'material-item'])

export const promptSlotTypeEnum = z.enum(['artist-style', 'song-style'])

export const createPromptSchema = z.object({
  target_type: promptTargetTypeEnum,
  target_id: z.string().uuid(),
  slot_type: promptSlotTypeEnum,
  name: z.string().min(1).max(255),
  content: z.string().min(1),
  is_default: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
})

export const updatePromptSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  is_default: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
})

export const promptIdParamsSchema = z.object({
  promptId: idSchema('prompt id'),
})

export const reorderPromptsSchema = z.object({
  target_type: promptTargetTypeEnum,
  target_id: z.string().uuid(),
  slot_type: promptSlotTypeEnum,
  items: z.array(z.object({
    id: z.string().uuid(),
    sort_order: z.number().int().min(0),
  })).min(1),
})
