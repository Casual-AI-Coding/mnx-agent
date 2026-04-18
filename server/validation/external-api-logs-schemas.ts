import { z } from 'zod'

export const serviceProviderEnum = z.enum(['minimax', 'openai', 'deepseek'])
export const externalApiStatusEnum = z.enum(['success', 'failed'])

export const listExternalApiLogsQuerySchema = z.object({
  service_provider: serviceProviderEnum.optional(),
  status: externalApiStatusEnum.optional(),
  operation: z.string().min(1).optional(),
  user_id: z.string().min(1).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.enum(['created_at', 'duration_ms']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
})

export type ListExternalApiLogsQuery = z.infer<typeof listExternalApiLogsQuerySchema>