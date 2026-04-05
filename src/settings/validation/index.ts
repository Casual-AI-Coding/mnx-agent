import { z } from 'zod'
import { accountSettingsSchema } from './account'
import { apiSettingsSchema } from './api'
import { uiSettingsSchema } from './ui'
import { generationSettingsSchema } from './generation'
import { cronSettingsSchema } from './cron'
import { workflowSettingsSchema } from './workflow'
import { notificationSettingsSchema } from './notification'
import { mediaSettingsSchema } from './media'
import { privacySettingsSchema } from './privacy'
import { accessibilitySettingsSchema } from './accessibility'

export const allSettingsSchema = z.object({
  account: accountSettingsSchema,
  api: apiSettingsSchema,
  ui: uiSettingsSchema,
  generation: generationSettingsSchema,
  cron: cronSettingsSchema,
  workflow: workflowSettingsSchema,
  notification: notificationSettingsSchema,
  media: mediaSettingsSchema,
  privacy: privacySettingsSchema,
  accessibility: accessibilitySettingsSchema,
})

export type AllSettingsInput = z.infer<typeof allSettingsSchema>

export * from './account'
export * from './api'
export * from './ui'
export * from './generation'
export * from './cron'
export * from './workflow'
export * from './notification'
export * from './media'
export * from './privacy'
export * from './accessibility'