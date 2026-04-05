import { z } from 'zod'

export const accountSettingsSchema = z.object({
  username: z.string().min(1).max(50),
  email: z.string().email().nullable(),
  role: z.enum(['user', 'pro', 'admin', 'super']),
  locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/),
  timezone: z.string().min(1),
  sessionTimeout: z.number().int().min(0).max(1440),
  lastPasswordChange: z.date().optional(),
})

export type AccountSettingsInput = z.infer<typeof accountSettingsSchema>