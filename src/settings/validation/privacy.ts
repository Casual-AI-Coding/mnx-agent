import { z } from 'zod'

export const privacySettingsSchema = z.object({
  shareUsageData: z.boolean(),
  autoRefreshToken: z.boolean(),
  secureExport: z.boolean(),
  auditLogRetention: z.number().int().min(7).max(365),
})

export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>