import { z } from 'zod'

// Workflow validation schemas

export const workflowIdParamsSchema = z.object({
  id: z.string().min(1),
})

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  nodes_json: z.string().min(1),
  edges_json: z.string().min(1),
  is_template: z.boolean().default(false),
})

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  nodes_json: z.string().min(1).optional(),
  edges_json: z.string().min(1).optional(),
  is_template: z.boolean().optional(),
})

export const listWorkflowsQuerySchema = z.object({
  is_template: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})