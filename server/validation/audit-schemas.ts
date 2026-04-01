import { z } from 'zod'

export const auditActionEnum = z.enum(['create', 'update', 'delete', 'execute'])

export const listAuditLogsQuerySchema = z.object({
  action: auditActionEnum.optional(),
  resource_type: z.string().min(1).optional(),
  resource_id: z.string().min(1).optional(),
  user_id: z.string().min(1).optional(),
  response_status: z.coerce.number().int().min(100).max(599).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>