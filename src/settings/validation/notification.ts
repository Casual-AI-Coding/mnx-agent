import { z } from 'zod'

export const notificationSettingsSchema = z.object({
  webhookEnabled: z.boolean(),
  webhookUrl: z.string().url().or(z.literal('')),
  webhookSecret: z.string().max(256),
  emailEnabled: z.boolean(),
  desktopEnabled: z.boolean(),
  soundEnabled: z.boolean(),
  events: z.array(z.enum(['start', 'success', 'failure', 'retry'])),
})

export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>