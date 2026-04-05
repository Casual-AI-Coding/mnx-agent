import { z } from 'zod'
import { MediaType, MediaSource } from '../entities/enums.js'

export const createMediaSchema = z.object({
  filename: z.string().min(1),
  original_name: z.string().optional(),
  filepath: z.string().min(1),
  type: z.enum(['audio', 'image', 'video', 'music']),
  mime_type: z.string().optional(),
  size_bytes: z.number().int().min(0),
  source: z.enum([
    'voice_sync',
    'voice_async',
    'image_generation',
    'video_generation',
    'music_generation',
  ]).optional(),
  task_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateMediaSchema = z.object({
  filename: z.string().min(1).optional(),
  original_name: z.string().optional().nullable(),
  is_deleted: z.boolean().optional(),
  deleted_at: z.string().optional().nullable(),
})

export const mediaIdParamsSchema = z.object({
  id: z.string().min(1),
})

export const listMediaQuerySchema = z.object({
  type: z.enum(['audio', 'image', 'video', 'music']).optional(),
  source: z.enum([
    'voice_sync',
    'voice_async',
    'image_generation',
    'video_generation',
    'music_generation',
  ]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
})

export type CreateMediaRequest = z.infer<typeof createMediaSchema>
export type UpdateMediaRequest = z.infer<typeof updateMediaSchema>
export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>