import { z } from 'zod'

export const settingsCategorySchema = z.enum([
  'account',
  'api',
  'ui',
  'generation',
  'cron',
  'workflow',
  'notification',
  'media',
  'privacy',
  'accessibility',
])

export const settingsCategoryParamsSchema = z.object({
  category: settingsCategorySchema,
})

export const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.unknown()),
})

export const settingsHistoryQuerySchema = z.object({
  category: settingsCategorySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})