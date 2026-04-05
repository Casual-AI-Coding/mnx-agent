import { z } from 'zod'

export const mediaSettingsSchema = z.object({
  storagePath: z.string().min(1),
  autoSave: z.boolean(),
  namingPattern: z.string().min(1),
  maxFileSize: z.number().int().min(1).max(1000),
  allowedTypes: z.array(z.string()),
  retentionDays: z.number().int().min(0).max(365),
  thumbnailSize: z.number().int().min(50).max(500),
})

export type MediaSettingsInput = z.infer<typeof mediaSettingsSchema>