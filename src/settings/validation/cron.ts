import { z } from 'zod'

export const cronSettingsSchema = z.object({
  defaultTimezone: z.string().min(1),
  timeoutSeconds: z.number().int().min(30).max(3600),
  maxRetries: z.number().int().min(0).max(10),
  retryBackoff: z.enum(['exponential', 'linear', 'fixed']),
  concurrency: z.number().int().min(1).max(20),
  misfirePolicy: z.enum(['fire_once', 'ignore', 'fire_all']),
})

export type CronSettingsInput = z.infer<typeof cronSettingsSchema>