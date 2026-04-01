import { z } from 'zod'

export const templateCategoryEnum = z.enum(['text', 'image', 'music', 'video', 'general'])

export const templateVariableSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().optional().default(false),
  default_value: z.string().optional(),
})

export const listTemplatesQuerySchema = z.object({
  category: templateCategoryEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const templateIdParamsSchema = z.object({
  id: z.string().min(1),
})

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  content: z.string().min(1),
  category: templateCategoryEnum.optional(),
  variables: z.array(templateVariableSchema).optional().default([]),
  is_builtin: z.boolean().optional().default(false),
})

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  content: z.string().min(1).optional(),
  category: templateCategoryEnum.optional().nullable(),
  variables: z.array(templateVariableSchema).optional(),
})
