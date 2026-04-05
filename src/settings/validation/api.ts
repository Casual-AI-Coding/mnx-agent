import { z } from 'zod'

export const apiSettingsSchema = z.object({
  minimaxKey: z.string().min(32).max(128),
  region: z.enum(['cn', 'intl']),
  mode: z.enum(['direct', 'proxy']),
  timeout: z.number().int().min(1000).max(120000),
  retryAttempts: z.number().int().min(0).max(10),
  retryDelay: z.number().int().min(100).max(30000),
})

export type ApiSettingsInput = z.infer<typeof apiSettingsSchema>