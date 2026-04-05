import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const idParamSchema = z.object({
  id: z.string().min(1, 'id is required'),
})

export const taskStatusEnum = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
])

export const executionStatusEnum = z.enum([
  'running',
  'completed',
  'failed',
  'partial',
])

export const mediaTypeEnum = z.enum(['audio', 'image', 'video', 'music'])

export const taskTypeEnum = z.enum([
  'text',
  'voice_sync',
  'voice_async',
  'image',
  'music',
  'video',
])

export const sortDirectionEnum = z.enum(['asc', 'desc'])

export const sortQuerySchema = z.object({
  sort_by: z.string().optional(),
  sort_order: sortDirectionEnum.default('desc'),
})

export const dateRangeQuerySchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
})

export const searchQuerySchema = z.object({
  search: z.string().optional(),
})

export type PaginationInput = z.infer<typeof paginationSchema>
export type IdParamInput = z.infer<typeof idParamSchema>
export type TaskStatus = z.infer<typeof taskStatusEnum>
export type ExecutionStatus = z.infer<typeof executionStatusEnum>
export type MediaType = z.infer<typeof mediaTypeEnum>
export type TaskType = z.infer<typeof taskTypeEnum>